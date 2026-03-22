import { open, readdir, readFile, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import type {
  AgentTurnRequest,
  AgentTurnResponse,
  ApprovalsActionResponse,
  ApprovalsApproveRequest,
  ApprovalsGetResponse,
  ApprovalsRejectRequest,
  CronListResponse,
  SessionStatusResponse,
  SessionsHistoryRequest,
  SessionsHistoryResponse,
  SessionsListResponse,
} from "../contracts/openclaw-tools";
import { APPROVAL_ACTIONS_ENABLED } from "../config";
import { loadCurrentAgentCatalog, resolveOpenClawHomePath } from "../runtime/current-agent-catalog";
import { swapOpenClawAgentToFallbackModel } from "../runtime/openclaw-agent-models";
import { runOpenClawCommand } from "../runtime/openclaw-cli";
import {
  GatewayStreamStartError,
  streamOpenClawGatewayAgentTurn,
} from "./openclaw-gateway-stream";
import type { ToolClient } from "./tool-client";

interface SessionCacheItem {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  sessionFile?: string;
}

const ACTIVE_SESSION_STATES = new Set([
  "running",
  "active",
  "busy",
  "blocked",
  "waiting_approval",
  "working",
  "in_progress",
  "processing",
  "thinking",
  "executing",
  "streaming",
]);
const INACTIVE_SESSION_STATES = new Set([
  "idle",
  "inactive",
  "error",
  "failed",
  "stopped",
  "stopping",
  "closed",
  "done",
  "completed",
  "complete",
  "paused",
  "aborted",
  "terminated",
  "cancelled",
  "canceled",
]);
const FALLBACK_ACTIVE_RECENCY_WINDOW_MS = 45 * 60 * 1000;
const SESSION_HISTORY_TAIL_MIN_LINES = 80;
const SESSION_HISTORY_TAIL_LINE_MULTIPLIER = 8;
const SESSION_HISTORY_TAIL_CHUNK_BYTES = 64 * 1024;
const SESSION_HISTORY_RECOVERY_TIMEOUT_MS = 1_500;
const AGENT_TURN_SESSION_HISTORY_LOOKBACK_LIMIT = 80;
const AGENT_TURN_RETRY_BATCH_SIZE = 3;
const AGENT_TURN_RETRY_DELAY_MS = 400;
const AGENT_TURN_TRANSIENT_RETRY_LIMIT = 3;
const AGENT_TURN_TRANSIENT_RETRY_DELAY_MS = 1_200;
const AGENT_TURN_STALE_LOCK_MIN_AGE_MS = 30 * 60 * 1000;
const AGENT_TURN_STALE_LOCK_FORCE_AGE_MS = 30 * 60 * 1000;
const AGENT_TURN_STALE_LOCK_RETRY_DELAY_MS = 250;

interface SessionLockFailureDetails {
  lockPath?: string;
  ownerPid?: number;
}

interface SessionLockMetadata {
  ownerPid?: number;
  createdAtMs?: number;
  startTime?: string;
}

interface AgentTurnAttemptInput {
  agentId: string;
  message: string;
  sessionId?: string;
  sessionKey?: string;
  timeoutSeconds: number;
  preferGatewayStream?: boolean;
  onStreamEvent?: AgentTurnRequest["onStreamEvent"];
}

interface ResolvedAgentTurnSessionBinding {
  sessionId?: string;
  sessionKey?: string;
  sessionFile?: string;
}

/**
 * Live read client using official OpenClaw CLI JSON outputs.
 * Read-only by design: only list/status commands are used.
 */
export class OpenClawLiveClient implements ToolClient {
  private sessionCache = new Map<string, SessionCacheItem>();
  private sessionFileCache = new Map<string, string>();

  async sessionsList(): Promise<SessionsListResponse> {
    const openclawHome = resolveOpenClawHomePath();
    const configuredAgentKeys = await this.loadConfiguredAgentKeys();
    const storeResponse = await this.loadSessionsFromStores({
      openclawHome,
      configuredAgentKeys,
    });
    const storeSessions = storeResponse.sessions ?? [];

    if (storeSessions.length > 0) {
      return storeResponse;
    }

    try {
      const sessions = await this.loadSessionsFromCli(openclawHome, configuredAgentKeys);
      this.rememberSessions(sessions);
      return { sessions };
    } catch {
      return storeResponse;
    }
  }

  private async loadSessionsFromCli(
    openclawHome: string,
    configuredAgentKeys: Set<string>,
    options?: { timeoutMs?: number },
  ): Promise<NonNullable<SessionsListResponse["sessions"]>> {
    const data = await runJson<{ sessions?: Array<Record<string, unknown>> }>(
      ["sessions", "--json"],
      { timeoutMs: options?.timeoutMs },
    );

    return (data.sessions ?? []).map((item) => ({
      key: asString(item.key) ?? asString(item.sessionKey),
      sessionKey: asString(item.sessionKey) ?? asString(item.key),
      sessionId: asString(item.sessionId),
      agentId: asString(item.agentId),
      updatedAtMs: asNumber(item.updatedAt),
      sessionFile:
        asString(item.sessionFile) ??
        buildSessionFilePath(openclawHome, asString(item.agentId), asString(item.sessionId)),
      model: asString(item.model),
      inputTokens: asNumber(item.inputTokens),
      outputTokens: asNumber(item.outputTokens),
      totalTokens: asNumber(item.totalTokens),
      state: readSessionState(item),
      active: asBoolean(item.active) ?? false,
    })).filter((item) =>
      matchesConfiguredAgents(item.agentId ?? extractAgentIdFromSessionKey(item.sessionKey), configuredAgentKeys),
    );
  }

  async sessionStatus(sessionKey: string): Promise<SessionStatusResponse> {
    const cached = this.sessionCache.get(sessionKey);
    const rawText = cached
      ? `Model: ${cached.model ?? "unknown"}\nTokens: ${cached.inputTokens ?? 0} in / ${cached.outputTokens ?? 0} out\nTotal: ${cached.totalTokens ?? 0}`
      : "";

    return { rawText };
  }

  async sessionsHistory(request: SessionsHistoryRequest): Promise<SessionsHistoryResponse> {
    const sessionKey = request.sessionKey.trim();
    if (!sessionKey) {
      return { rawText: "" };
    }

    const limit = normalizeLimit(request.limit);
    let sessionFile = this.sessionCache.get(sessionKey)?.sessionFile;
    if (!sessionFile) {
      sessionFile = await this.lookupSessionFile(sessionKey);
    }
    if (sessionFile) {
      const fromFile = await readSessionHistoryFile(sessionFile, limit);
      if (fromFile) return fromFile;
      return readSessionHistoryFromCli(sessionKey, limit, {
        timeoutMs: SESSION_HISTORY_RECOVERY_TIMEOUT_MS,
      });
    }
    return readSessionHistoryFromCli(sessionKey, limit);
  }

  async cronList(): Promise<CronListResponse> {
    let data: { jobs?: Array<Record<string, unknown>> };
    try {
      data = await runJson<{ jobs?: Array<Record<string, unknown>> }>(
        ["cron", "list", "--json"],
        { timeoutMs: 2_500 },
      );
    } catch {
      return { jobs: [] };
    }

    const jobs = (data.jobs ?? []).map((job) => ({
      id: asString(job.id),
      name: asString(job.name),
      enabled: asBoolean(job.enabled),
      state: asObject(job.state)
        ? {
            nextRunAtMs: asNumber(asObject(job.state)?.nextRunAtMs),
          }
        : undefined,
    }));

    return { jobs };
  }

  async approvalsGet(): Promise<ApprovalsGetResponse> {
    try {
      const json = await runJson<Record<string, unknown>>(
        ["approvals", "get", "--json"],
        { timeoutMs: 2_500 },
      );
      return {
        json,
        rawText: JSON.stringify(json),
      };
    } catch {
      try {
        const rawText = await runText(["approvals", "get"], { timeoutMs: 1_500 });
        return { rawText };
      } catch {
        return { rawText: "" };
      }
    }
  }

  async approvalsApprove(request: ApprovalsApproveRequest): Promise<ApprovalsActionResponse> {
    assertApprovalActionsEnabled("approve");
    const args = ["approvals", "approve", request.approvalId];
    if (request.reason) args.push("--reason", request.reason);

    const rawText = await runText(args);
    return {
      ok: true,
      action: "approve",
      approvalId: request.approvalId,
      reason: request.reason,
      rawText,
    };
  }

  async approvalsReject(request: ApprovalsRejectRequest): Promise<ApprovalsActionResponse> {
    assertApprovalActionsEnabled("reject");
    const args = ["approvals", "reject", request.approvalId, "--reason", request.reason];
    const rawText = await runText(args);
    return {
      ok: true,
      action: "reject",
      approvalId: request.approvalId,
      reason: request.reason,
      rawText,
    };
  }

  async agentTurn(request: AgentTurnRequest): Promise<AgentTurnResponse> {
    const agentId = request.agentId.trim();
    const message = request.message.trim();
    if (!agentId) {
      return {
        ok: false,
        agentId: request.agentId,
        replyText: "",
        durationMs: 0,
        rawText: "",
        failureReason: "agentId is required.",
      };
    }
    if (!message) {
      return {
        ok: false,
        agentId,
        replyText: "",
        durationMs: 0,
        rawText: "",
        failureReason: "message is required.",
      };
    }

    const startedAt = Date.now();
    // `openclaw health` has produced false negatives on some local setups while
    // the actual `openclaw agent` command still succeeds. Use the real turn as
    // the source of truth so collaboration dispatch is not blocked by a flaky
    // precheck.
    let beforeSessions = await this.sessionsList();
    const timeoutSeconds = normalizeAgentTurnTimeout(request.timeoutSeconds);
    let requestedSession = resolveRequestedAgentTurnSessionBinding(
      agentId,
      beforeSessions,
      request.sessionId?.trim(),
      request.sessionKey?.trim(),
    );
    let response: AgentTurnResponse | undefined;
    let fallbackEvaluated = false;
    for (let attempt = 1; ; attempt += 1) {
      response = await this.runAgentTurnAttempt({
        agentId,
        message,
        sessionId: requestedSession.sessionId,
        sessionKey: requestedSession.sessionKey,
        timeoutSeconds,
        preferGatewayStream: request.preferGatewayStream,
        onStreamEvent: request.onStreamEvent,
        beforeSessions,
        startedAt,
      });
      if (!fallbackEvaluated && shouldFailOverToFallbackModel(response)) {
        fallbackEvaluated = true;
        const swapped = await maybeSwapAgentTurnToFallbackModel(agentId);
        if (swapped) {
          requestedSession = {};
          beforeSessions = await this.sessionsList().catch(() => beforeSessions);
          console.warn(
            `[openclaw] upstream model failure for ${agentId}; switched ${swapped.previousModel} -> ${swapped.model} and retrying with a fresh session.`,
          );
          await sleep(AGENT_TURN_RETRY_DELAY_MS * attempt);
          continue;
        }
      }
      const retry502 = shouldRetryTemporary502AgentTurn(response);
      const retryTransient = shouldRetryTransientAgentTurn(response);
      const transientRecovery = retryTransient ? await maybeRecoverTransientAgentTurnFailure(response) : undefined;
      if (!retry502 && !retryTransient) {
        return response;
      }
      if (retryTransient && !retry502 && attempt >= AGENT_TURN_TRANSIENT_RETRY_LIMIT && !transientRecovery?.clearedStaleLock) {
        return response;
      }
      const batchAttempt = ((attempt - 1) % AGENT_TURN_RETRY_BATCH_SIZE) + 1;
      const nextBatchAttempt = (attempt % AGENT_TURN_RETRY_BATCH_SIZE) + 1;
      const batchNumber = Math.floor((attempt - 1) / AGENT_TURN_RETRY_BATCH_SIZE) + 1;
      if (retry502) {
        console.warn(
          batchAttempt === AGENT_TURN_RETRY_BATCH_SIZE
            ? `[openclaw] temporary 502 from agent ${agentId}; completed retry batch ${batchNumber}/${batchAttempt}. Continuing with the next automatic retry batch.`
            : `[openclaw] temporary 502 from agent ${agentId}; retrying batch ${batchNumber} attempt ${nextBatchAttempt}/${AGENT_TURN_RETRY_BATCH_SIZE}`,
        );
        await sleep(AGENT_TURN_RETRY_DELAY_MS * attempt);
        continue;
      }
      if (transientRecovery?.clearedStaleLock) {
        console.warn(
          `[openclaw] cleared stale session lock for ${agentId}${transientRecovery.lockPath ? ` at ${transientRecovery.lockPath}` : ""}; retrying ${attempt + 1}/${AGENT_TURN_TRANSIENT_RETRY_LIMIT}.`,
        );
        await sleep(AGENT_TURN_STALE_LOCK_RETRY_DELAY_MS);
        continue;
      }
      console.warn(
        `[openclaw] transient agent turn failure for ${agentId}; retrying ${attempt + 1}/${AGENT_TURN_TRANSIENT_RETRY_LIMIT} after a short delay.`,
      );
      await sleep(AGENT_TURN_TRANSIENT_RETRY_DELAY_MS * attempt);
    }

    return response ?? {
      ok: false,
      agentId,
      replyText: "",
      durationMs: Date.now() - startedAt,
      rawText: "",
      failureReason: "Agent turn failed without a response.",
    };
  }

  private async runAgentTurnAttempt(input: AgentTurnAttemptInput & {
    beforeSessions: SessionsListResponse;
    startedAt: number;
  }): Promise<AgentTurnResponse> {
    if (
      (input.preferGatewayStream || input.onStreamEvent) &&
      input.sessionKey?.trim()
    ) {
      try {
        return await this.runGatewayAgentTurnAttempt(input);
      } catch (error) {
        if (!(error instanceof GatewayStreamStartError)) {
          throw error;
        }
      }
    }

    const args = buildAgentTurnCliArgs(input);

    try {
      const rawText = await runText(args, {
        timeoutMs: input.timeoutSeconds * 1000 + 30_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      const rawJson = parseEmbeddedJson(rawText);
      const completion = inspectAgentTurnCompletion(rawJson);
      const afterSessions = await this.sessionsList();
      const resolvedSession = this.resolveLatestAgentSession(
        input.agentId,
        input.beforeSessions,
        afterSessions,
        input.sessionId,
        input.sessionKey,
      );
      const rawReplyText = extractAgentReplyText(rawJson);
      const recoveredReply = await this.maybeRecoverFinalAssistantReplyFromSessionHistory({
        sessionId: resolvedSession?.sessionId,
        sessionKey: resolvedSession?.sessionKey ?? input.sessionKey,
        sessionFile: resolvedSession?.sessionFile,
        startedAtMs: input.startedAt,
        waitForFinal: !looksLikeFinalAgentTurnReply(rawReplyText, completion),
      });
      const applied = applyRecoveredAssistantReply({
        ok: true,
        replyText: rawReplyText,
        completion,
        recoveredReply,
      });
      return {
        ok: applied.ok,
        agentId: input.agentId,
        replyText: applied.replyText,
        durationMs: Date.now() - input.startedAt,
        sessionId: resolvedSession?.sessionId,
        sessionKey: resolvedSession?.sessionKey,
        rawText,
        rawJson: asObject(rawJson),
        stopReason: applied.stopReason,
        errorMessage: applied.errorMessage,
        incomplete: applied.incomplete,
      };
    } catch (error) {
      const rawText = extractOpenClawCommandErrorText(error);
      const rawJson = parseEmbeddedJson(rawText);
      const completion = inspectAgentTurnCompletion(rawJson);
      const afterSessions = await this.sessionsList().catch(() => input.beforeSessions);
      const resolvedSession = this.resolveLatestAgentSession(
        input.agentId,
        input.beforeSessions,
        afterSessions,
        input.sessionId,
        input.sessionKey,
      );
      const rawReplyText = extractAgentReplyText(rawJson);
      const recoveredReply = await this.maybeRecoverFinalAssistantReplyFromSessionHistory({
        sessionId: resolvedSession?.sessionId,
        sessionKey: resolvedSession?.sessionKey ?? input.sessionKey,
        sessionFile: resolvedSession?.sessionFile,
        startedAtMs: input.startedAt,
        waitForFinal: true,
      });
      const applied = applyRecoveredAssistantReply({
        ok: false,
        replyText: rawReplyText,
        completion,
        recoveredReply,
      });
      return {
        ok: applied.ok,
        agentId: input.agentId,
        replyText: applied.replyText,
        durationMs: Date.now() - input.startedAt,
        sessionId: resolvedSession?.sessionId,
        sessionKey: resolvedSession?.sessionKey,
        rawText,
        rawJson: asObject(rawJson),
        failureReason: applied.ok
          ? undefined
          : completion.errorMessage?.trim() ||
            firstNonEmptyLine(rawText) ||
            (error instanceof Error ? error.message : "Agent turn failed."),
        stopReason: applied.stopReason,
        errorMessage: applied.errorMessage,
        incomplete: applied.incomplete,
      };
    }
  }

  private async runGatewayAgentTurnAttempt(input: AgentTurnAttemptInput & {
    beforeSessions: SessionsListResponse;
    startedAt: number;
  }): Promise<AgentTurnResponse> {
    const streamed = await streamOpenClawGatewayAgentTurn({
      agentId: input.agentId,
      message: input.message,
      sessionKey: input.sessionKey || "",
      timeoutSeconds: input.timeoutSeconds,
      onStreamEvent: input.onStreamEvent,
    });
    const afterSessions = await this.sessionsList().catch(() => input.beforeSessions);
    const resolvedSession = this.resolveLatestAgentSession(
      input.agentId,
      input.beforeSessions,
      afterSessions,
      input.sessionId,
      input.sessionKey,
    );
    const rawText =
      streamed.rawPayload
        ? JSON.stringify(streamed.rawPayload)
        : streamed.errorMessage?.trim() || streamed.replyText;
    const completion = inspectAgentTurnCompletion({
      stopReason: streamed.stopReason,
      errorMessage: streamed.errorMessage,
      payloads: streamed.replyText ? [{ text: streamed.replyText }] : [],
      message: streamed.replyText || undefined,
    });
    const recoveredReply = await this.maybeRecoverFinalAssistantReplyFromSessionHistory({
      sessionId: resolvedSession?.sessionId,
      sessionKey: resolvedSession?.sessionKey ?? input.sessionKey,
      sessionFile: resolvedSession?.sessionFile,
      startedAtMs: input.startedAt,
      waitForFinal: !looksLikeFinalAgentTurnReply(streamed.replyText, completion),
    });
    const applied = applyRecoveredAssistantReply({
      ok: !streamed.errorMessage,
      replyText: streamed.replyText,
      completion,
      recoveredReply,
    });

    return {
      ok: applied.ok,
      agentId: input.agentId,
      runId: streamed.runId,
      replyText: applied.replyText,
      durationMs: Date.now() - input.startedAt,
      sessionId: resolvedSession?.sessionId,
      sessionKey: resolvedSession?.sessionKey,
      rawText,
      rawJson: streamed.rawPayload,
      failureReason: applied.ok
        ? undefined
        : streamed.errorMessage?.trim() ||
          firstNonEmptyLine(rawText) ||
          "Agent turn failed.",
      stopReason: applied.stopReason,
      errorMessage: applied.errorMessage,
      incomplete: applied.incomplete,
    };
  }

  private async maybeRecoverFinalAssistantReplyFromSessionHistory(input: {
    sessionId?: string;
    sessionKey?: string;
    sessionFile?: string;
    startedAtMs: number;
    waitForFinal: boolean;
  }): Promise<RecoveredAssistantReply | undefined> {
    const sessionKey = input.sessionKey?.trim();
    const sessionFile =
      input.sessionFile?.trim() ||
      (sessionKey ? this.sessionCache.get(sessionKey)?.sessionFile : undefined) ||
      (sessionKey ? await this.lookupSessionFile(sessionKey) : undefined);
    if (!sessionKey && !sessionFile) {
      return undefined;
    }

    const deadline = Date.now() + SESSION_HISTORY_RECOVERY_TIMEOUT_MS;
    while (true) {
      const history =
        (sessionFile
          ? await readSessionHistoryFile(
            sessionFile,
            AGENT_TURN_SESSION_HISTORY_LOOKBACK_LIMIT,
          )
          : undefined) ??
        (sessionKey
          ? await this.sessionsHistory({
            sessionKey,
            limit: AGENT_TURN_SESSION_HISTORY_LOOKBACK_LIMIT,
          })
          : undefined);
      const candidate = selectLatestFinalAssistantReplyFromHistory(history, input.startedAtMs);
      if (candidate) {
        return candidate;
      }
      if (!input.waitForFinal || Date.now() >= deadline) {
        return undefined;
      }
      await sleep(200);
    }
  }

  private async loadSessionsFromStores(input?: {
    openclawHome?: string;
    configuredAgentKeys?: Set<string>;
  }): Promise<SessionsListResponse> {
    const openclawHome = input?.openclawHome ?? resolveOpenClawHomePath();
    const agentsPath = join(openclawHome, "agents");
    const configuredAgentKeys = input?.configuredAgentKeys ?? (await this.loadConfiguredAgentKeys());
    let agentDirs: string[] = [];
    try {
      const entries = await readdir(agentsPath, { withFileTypes: true });
      agentDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return { sessions: [] };
    }

    if (configuredAgentKeys.size > 0) {
      agentDirs = agentDirs.filter((agentId) => matchesConfiguredAgents(agentId, configuredAgentKeys));
    }

    const sessions: SessionsListResponse["sessions"] = [];
    for (const agentId of agentDirs) {
      const sessionsPath = join(agentsPath, agentId, "sessions", "sessions.json");
      try {
        const parsed = JSON.parse(await readFile(sessionsPath, "utf8")) as unknown;
        const records = extractSessionRecords(parsed);
        for (const record of records) {
          const sessionKey = asString(record.key) ?? asString(record.sessionKey);
          if (!sessionKey) continue;
          const updatedAtMs = readUpdatedAtMs(record);
          sessions.push({
            key: sessionKey,
            sessionKey,
            sessionId: asString(record.sessionId),
            agentId: asString(record.agentId) ?? agentId,
            updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : undefined,
            sessionFile:
              asString(record.sessionFile) ??
              buildSessionFilePath(openclawHome, asString(record.agentId) ?? agentId, asString(record.sessionId)),
            model: asString(record.model),
            inputTokens: asNumber(record.inputTokens),
            outputTokens: asNumber(record.outputTokens),
            totalTokens: asNumber(record.totalTokens),
            state: readSessionState(record),
            active: isSessionActive(record, updatedAtMs),
          });
        }
      } catch {
        continue;
      }
    }

    sessions.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
    this.rememberSessions(sessions);
    return { sessions };
  }

  private async lookupSessionFile(sessionKey: string): Promise<string | undefined> {
    const cached = this.sessionFileCache.get(sessionKey);
    if (cached) return cached;

    const openclawHome = resolveOpenClawHomePath();
    const agentsPath = join(openclawHome, "agents");
    const configuredAgentKeys = await this.loadConfiguredAgentKeys();
    if (!matchesConfiguredAgents(extractAgentIdFromSessionKey(sessionKey), configuredAgentKeys)) {
      return undefined;
    }
    let agentDirs: string[] = [];
    try {
      const entries = await readdir(agentsPath, { withFileTypes: true });
      agentDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return undefined;
    }

    if (configuredAgentKeys.size > 0) {
      agentDirs = agentDirs.filter((agentId) => matchesConfiguredAgents(agentId, configuredAgentKeys));
    }

    for (const agentId of agentDirs) {
      const sessionsPath = join(agentsPath, agentId, "sessions", "sessions.json");
      try {
        const parsed = JSON.parse(await readFile(sessionsPath, "utf8")) as unknown;
        for (const record of extractSessionRecords(parsed)) {
          const key = asString(record.key) ?? asString(record.sessionKey);
          const sessionFile =
            asString(record.sessionFile) ??
            buildSessionFilePath(openclawHome, asString(record.agentId) ?? agentId, asString(record.sessionId));
          if (!key || !sessionFile) continue;
          this.sessionFileCache.set(key, sessionFile);
        }
      } catch {
        continue;
      }
    }

    const discovered = this.sessionFileCache.get(sessionKey);
    if (discovered) {
      return discovered;
    }

    try {
      const cliSessions = await this.loadSessionsFromCli(openclawHome, configuredAgentKeys, {
        timeoutMs: SESSION_HISTORY_RECOVERY_TIMEOUT_MS,
      });
      this.rememberSessions(cliSessions);
    } catch {
      // Ignore transient CLI lookup failures and fall back to the local cache only.
    }

    return this.sessionFileCache.get(sessionKey);
  }

  private async loadConfiguredAgentKeys(): Promise<Set<string>> {
    const catalog = await loadCurrentAgentCatalog();
    return new Set(catalog.entries.map((entry) => normalizeAgentKey(entry.agentId)));
  }

  private rememberSessions(sessions: NonNullable<SessionsListResponse["sessions"]>): void {
    this.sessionCache.clear();
    for (const session of sessions) {
      if (!session.sessionKey) continue;
      this.sessionCache.set(session.sessionKey, {
        model: session.model,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens: session.totalTokens,
        sessionFile: session.sessionFile,
      });
      if (session.sessionFile) {
        this.sessionFileCache.set(session.sessionKey, session.sessionFile);
      }
    }
  }

  private resolveLatestAgentSession(
    agentId: string,
    beforeSessions: SessionsListResponse,
    afterSessions: SessionsListResponse,
    preferredSessionId?: string,
    preferredSessionKey?: string,
  ): { sessionId?: string; sessionKey?: string; sessionFile?: string } | undefined {
    const normalizedAgentId = normalizeAgentKey(agentId);
    const beforeItems = (beforeSessions.sessions ?? []).filter(
      (item) => normalizeAgentKey(item.agentId ?? extractAgentIdFromSessionKey(item.sessionKey)) === normalizedAgentId,
    );
    const afterItems = (afterSessions.sessions ?? []).filter(
      (item) => normalizeAgentKey(item.agentId ?? extractAgentIdFromSessionKey(item.sessionKey)) === normalizedAgentId,
    );
    const preferredItems = afterItems.length > 0 ? afterItems : beforeItems;
    if (preferredSessionKey?.trim()) {
      const preferred = preferredItems.find(
        (item) => normalizeSessionKey(item.sessionKey ?? item.key) === normalizeSessionKey(preferredSessionKey),
      );
      if (preferred) {
        return {
          sessionId: preferred.sessionId,
          sessionKey: preferred.sessionKey ?? preferred.key,
          sessionFile: preferred.sessionFile,
        };
      }
    }
    if (preferredSessionId?.trim()) {
      const preferred = preferredItems.find((item) => (item.sessionId ?? "").trim() === preferredSessionId.trim());
      if (preferred) {
        return {
          sessionId: preferred.sessionId,
          sessionKey: preferred.sessionKey ?? preferred.key,
          sessionFile: preferred.sessionFile,
        };
      }
    }

    const requestedSessionId = preferredSessionId?.trim() || undefined;
    const requestedSessionKey = preferredSessionKey?.trim() || undefined;
    if (requestedSessionId || requestedSessionKey) {
      const unionItems = [...afterItems, ...beforeItems];
      const requested = unionItems.find((item) => {
        if (requestedSessionId && (item.sessionId ?? "").trim() === requestedSessionId) {
          return true;
        }
        const candidateKey = item.sessionKey ?? item.key;
        return Boolean(
          requestedSessionKey &&
          normalizeSessionKey(candidateKey) === normalizeSessionKey(requestedSessionKey),
        );
      });
      return {
        sessionId: requested?.sessionId ?? requestedSessionId,
        sessionKey: requested?.sessionKey ?? requested?.key ?? requestedSessionKey,
        sessionFile: requested?.sessionFile,
      };
    }

    const beforeBySessionId = new Map(
      beforeItems.map((item) => [item.sessionId ?? item.sessionKey ?? item.key ?? "", item]),
    );

    const newest =
      afterItems.find((item) => !beforeBySessionId.has(item.sessionId ?? item.sessionKey ?? item.key ?? "")) ??
      [...(afterItems.length > 0 ? afterItems : beforeItems)].sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))[0];
    if (!newest) return undefined;
    return {
      sessionId: newest.sessionId,
      sessionKey: newest.sessionKey ?? newest.key,
      sessionFile: newest.sessionFile,
    };
  }
}

function buildAgentTurnCliArgs(input: AgentTurnAttemptInput): string[] {
  const args = ["agent", "--json", "--agent", input.agentId, "--message", input.message];
  if (input.sessionId) {
    args.push("--session-id", input.sessionId);
  }
  args.push("--timeout", String(input.timeoutSeconds));
  return args;
}

function resolveRequestedAgentTurnSessionBinding(
  agentId: string,
  beforeSessions: SessionsListResponse,
  preferredSessionId?: string,
  preferredSessionKey?: string,
): ResolvedAgentTurnSessionBinding {
  const sessionId = preferredSessionId?.trim();
  const sessionKey = preferredSessionKey?.trim();
  if (sessionId) {
    return {
      sessionId,
      sessionKey,
    };
  }
  if (!sessionKey) {
    return {};
  }

  const normalizedAgentId = normalizeAgentKey(agentId);
  const keyAgentId = normalizeAgentKey(extractAgentIdFromSessionKey(sessionKey));
  if (keyAgentId && keyAgentId !== normalizedAgentId) {
    return {};
  }

  const match = (beforeSessions.sessions ?? []).find((item) => {
    const candidateKey = item.sessionKey ?? item.key;
    if (normalizeSessionKey(candidateKey) !== normalizeSessionKey(sessionKey)) {
      return false;
    }
    return normalizeAgentKey(item.agentId ?? extractAgentIdFromSessionKey(candidateKey)) === normalizedAgentId;
  });

  return {
    sessionId: match?.sessionId?.trim() || undefined,
    sessionKey: match?.sessionKey ?? match?.key ?? sessionKey,
  };
}

async function runJson<T>(args: string[], options?: { timeoutMs?: number; maxBuffer?: number }): Promise<T> {
  const stdout = await runText(args, options);
  return JSON.parse(stdout) as T;
}

async function runText(
  args: string[],
  options?: { timeoutMs?: number; maxBuffer?: number },
): Promise<string> {
  const { stdout } = await runOpenClawCommand(args, {
    timeoutMs: options?.timeoutMs ?? 20_000,
    maxBuffer: options?.maxBuffer ?? 2 * 1024 * 1024,
  });
  return stdout;
}

function extractOpenClawCommandErrorText(error: unknown): string {
  const object = asObject(error);
  return joinNonEmptyText(
    asString(object?.stdout),
    asString(object?.stderr),
    error instanceof Error ? error.message : undefined,
  );
}

function joinNonEmptyText(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join("\n");
}

function firstNonEmptyLine(input: string): string | undefined {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "");
}

async function readSessionHistoryFromCli(
  sessionKey: string,
  limit: number,
  options?: { timeoutMs?: number },
): Promise<SessionsHistoryResponse> {
  const attempts: string[][] = [
    ["sessions", "history", sessionKey, "--json", "--limit", String(limit)],
    ["sessions", "history", sessionKey, "--limit", String(limit), "--json"],
    ["sessions", "history", sessionKey, "--json"],
  ];

  for (const args of attempts) {
    try {
      const json = await runJson<Record<string, unknown>>(args, { timeoutMs: options?.timeoutMs });
      return {
        json,
        rawText: JSON.stringify(json),
      };
    } catch {
      continue;
    }
  }

  try {
    const rawText = await runHistoryText(sessionKey, limit, options);
    return normalizeRawHistoryText(rawText, limit);
  } catch {
    return { rawText: "" };
  }
}

async function runHistoryText(
  sessionKey: string,
  limit: number,
  options?: { timeoutMs?: number; maxBuffer?: number },
): Promise<string> {
  try {
    return await runText(["sessions", "history", sessionKey, "--limit", String(limit)], options);
  } catch (error) {
    if (!isUnknownLimitOptionError(error)) throw error;
  }

  const rawText = await runText(["sessions", "history", sessionKey], options);
  const trimmed = rawText.trim();
  if (trimmed === "") return rawText;
  const lines = trimmed.split(/\r?\n/);
  return lines.slice(-limit).join("\n");
}

function normalizeRawHistoryText(rawText: string, limit: number): SessionsHistoryResponse {
  const trimmed = rawText.trim();
  if (trimmed === "") return { rawText };

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "");
  const jsonLike = lines.every((line) => line.startsWith("{") || line.startsWith("["));
  if (jsonLike) {
    return normalizeSessionHistoryChunk(lines.join("\n"), limit);
  }

  return { rawText };
}

function isUnknownLimitOptionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /unknown option '--limit'/.test(error.message);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}

function normalizeLimit(input: number | undefined): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return 12;
  return Math.max(1, Math.min(200, Math.trunc(input)));
}

function normalizeAgentTurnTimeout(input: number | undefined): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return 180;
  return Math.max(15, Math.min(900, Math.trunc(input)));
}

async function readSessionHistoryFile(
  sessionFile: string,
  limit: number,
): Promise<SessionsHistoryResponse | undefined> {
  const targetLineCount = Math.max(limit * SESSION_HISTORY_TAIL_LINE_MULTIPLIER, SESSION_HISTORY_TAIL_MIN_LINES);
  try {
    const raw = await readRecentSessionHistoryChunk(sessionFile, targetLineCount);
    return normalizeSessionHistoryChunk(raw, limit);
  } catch {
    try {
      const raw = await readFile(sessionFile, "utf8");
      return normalizeSessionHistoryChunk(raw, limit);
    } catch {
      return undefined;
    }
  }
}

async function readRecentSessionHistoryChunk(sessionFile: string, targetLineCount: number): Promise<string> {
  const handle = await open(sessionFile, "r");
  try {
    const { size } = await handle.stat();
    if (size <= 0) return "";

    let position = size;
    let newlineCount = 0;
    const chunks: Buffer[] = [];

    while (position > 0 && newlineCount < targetLineCount) {
      const bytesToRead = Math.min(SESSION_HISTORY_TAIL_CHUNK_BYTES, position);
      position -= bytesToRead;

      const buffer = Buffer.allocUnsafe(bytesToRead);
      const { bytesRead } = await handle.read(buffer, 0, bytesToRead, position);
      if (bytesRead <= 0) break;

      const chunk = bytesRead === bytesToRead ? buffer : buffer.subarray(0, bytesRead);
      chunks.push(chunk);
      newlineCount += countLineFeeds(chunk);
    }

    if (chunks.length === 0) return "";

    const raw = Buffer.concat(chunks.reverse()).toString("utf8");
    if (position <= 0) return raw;

    const firstLineBreak = raw.indexOf("\n");
    return firstLineBreak >= 0 ? raw.slice(firstLineBreak + 1) : raw;
  } finally {
    await handle.close();
  }
}

function countLineFeeds(buffer: Uint8Array): number {
  let count = 0;
  for (const byte of buffer) {
    if (byte === 0x0a) count += 1;
  }
  return count;
}

function normalizeSessionHistoryChunk(raw: string, limit: number): SessionsHistoryResponse {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return { rawText: "" };

  const recentLines = lines.slice(-limit);
  const history = recentLines.map((line) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return line;
    }
  });
  return {
    json: { history },
    rawText: recentLines.join("\n"),
  };
}

function applyRecoveredAssistantReply(input: {
  ok: boolean;
  replyText: string;
  completion: AgentTurnCompletion;
  recoveredReply?: RecoveredAssistantReply;
}): {
  ok: boolean;
  replyText: string;
  stopReason?: string;
  errorMessage?: string;
  incomplete: boolean;
} {
  if (!input.recoveredReply?.replyText.trim()) {
    return {
      ok: input.ok,
      replyText: input.replyText,
      stopReason: input.completion.stopReason,
      errorMessage: input.completion.errorMessage,
      incomplete: input.completion.incomplete,
    };
  }
  return {
    ok: true,
    replyText: input.recoveredReply.replyText,
    stopReason: input.recoveredReply.stopReason ?? input.completion.stopReason ?? "stop",
    errorMessage: undefined,
    incomplete: false,
  };
}

function looksLikeFinalAgentTurnReply(replyText: string, completion: AgentTurnCompletion): boolean {
  if (!replyText.trim() || completion.incomplete) {
    return false;
  }
  const normalizedStopReason = normalizeAgentTurnStopReason(completion.stopReason);
  return isFinalAgentTurnStopReason(normalizedStopReason) || /<stage_result\b/i.test(replyText);
}

function selectLatestFinalAssistantReplyFromHistory(
  history: SessionsHistoryResponse | undefined,
  startedAtMs: number,
): RecoveredAssistantReply | undefined {
  const records = extractSessionHistoryRecords(history);
  let latest: RecoveredAssistantReply | undefined;
  for (const record of records) {
    const candidate = extractFinalAssistantReplyFromHistoryRecord(record, startedAtMs);
    if (!candidate) {
      continue;
    }
    if (!latest || candidate.timestampMs >= latest.timestampMs) {
      latest = candidate;
    }
  }
  return latest;
}

function extractSessionHistoryRecords(history: SessionsHistoryResponse | undefined): Record<string, unknown>[] {
  if (!history) {
    return [];
  }
  const jsonHistory = asObject(history.json)?.history;
  if (Array.isArray(jsonHistory)) {
    return jsonHistory.flatMap((item) => {
      const parsed = parseSessionHistoryRecord(item);
      return parsed ? [parsed] : [];
    });
  }
  return String(history.rawText || "")
    .split(/\r?\n/)
    .map((line) => parseSessionHistoryRecord(line))
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function parseSessionHistoryRecord(input: unknown): Record<string, unknown> | undefined {
  const object = asObject(input);
  if (object) return object;
  if (typeof input !== "string") return undefined;
  try {
    return asObject(JSON.parse(input));
  } catch {
    return undefined;
  }
}

function extractFinalAssistantReplyFromHistoryRecord(
  record: Record<string, unknown>,
  startedAtMs: number,
): RecoveredAssistantReply | undefined {
  if (normalizeSessionHistoryRecordType(record) !== "message") {
    return undefined;
  }
  const message = asObject(record.message);
  if (normalizeSessionHistoryMessageRole(message) !== "assistant") {
    return undefined;
  }
  const timestampMs = parseSessionHistoryTimestampMs(record, message);
  if (!Number.isFinite(timestampMs) || timestampMs + 1_000 < startedAtMs) {
    return undefined;
  }
  const replyText = extractVisibleAssistantTextFromHistoryMessage(message);
  if (!replyText) {
    return undefined;
  }
  const stopReason =
    asString(message?.stopReason) ??
    asString(message?.stop_reason) ??
    asString(record.stopReason) ??
    asString(record.stop_reason);
  const normalizedStopReason = normalizeAgentTurnStopReason(stopReason);
  const looksFinal =
    historyMessageHasFinalAnswerSignature(message) ||
    isFinalAgentTurnStopReason(normalizedStopReason) ||
    /<stage_result\b/i.test(replyText);
  if (!looksFinal) {
    return undefined;
  }
  return {
    replyText,
    stopReason: stopReason?.trim() || undefined,
    timestampMs,
  };
}

function normalizeSessionHistoryRecordType(record: Record<string, unknown>): string {
  return String(record.type || "").trim().toLowerCase();
}

function normalizeSessionHistoryMessageRole(message: Record<string, unknown> | undefined): string {
  return String(message?.role || "").trim().toLowerCase();
}

function parseSessionHistoryTimestampMs(
  record: Record<string, unknown>,
  message: Record<string, unknown> | undefined,
): number {
  const candidates = [
    record.timestamp,
    record.createdAt,
    message?.timestamp,
    message?.createdAt,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return normalizeEpochMs(candidate);
    }
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Date.parse(candidate.trim());
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
      if (/^\d+(\.\d+)?$/.test(candidate.trim())) {
        const numeric = Number(candidate.trim());
        if (Number.isFinite(numeric)) {
          return normalizeEpochMs(numeric);
        }
      }
    }
  }
  return Number.NaN;
}

function extractVisibleAssistantTextFromHistoryMessage(message: Record<string, unknown> | undefined): string {
  if (!message) {
    return "";
  }
  const collected: string[] = [];
  if (message.content !== undefined) {
    collectAgentReplyTextFragments(message.content, collected);
  }
  if (collected.length > 0) {
    return collected.join("\n\n").trim();
  }
  return (
    asString(message.replyText) ??
    asString(message.text) ??
    asString(message.message) ??
    asString(message.content) ??
    ""
  ).trim();
}

function historyMessageHasFinalAnswerSignature(message: Record<string, unknown> | undefined): boolean {
  return valueContainsFinalAnswerSignature(message?.content);
}

function valueContainsFinalAnswerSignature(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => valueContainsFinalAnswerSignature(item));
  }
  const obj = input as Record<string, unknown>;
  const signature = asString(obj.textSignature) ?? asString(obj.signature);
  if (signature && /"phase"\s*:\s*"final_answer"/i.test(signature)) {
    return true;
  }
  return Object.values(obj).some((value) => valueContainsFinalAnswerSignature(value));
}

function isFinalAgentTurnStopReason(input: string | undefined): boolean {
  return input === "stop" || input === "endturn" || input === "done" || input === "completed" || input === "complete";
}

function resolveAgentTurnResultObjects(input: unknown): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  const seen = new Set<Record<string, unknown>>();

  const visit = (value: unknown): void => {
    const obj = asObject(value);
    if (!obj || seen.has(obj)) return;
    seen.add(obj);
    output.push(obj);
    visit(obj.result);
    visit(obj.response);
    visit(asObject(obj.response)?.result);
  };

  visit(input);
  return output;
}

function extractAgentTurnPayloads(input: Record<string, unknown>): unknown[] {
  return Array.isArray(input.payloads) ? input.payloads : [];
}

function collectAgentReplyTextFragments(input: unknown, output: string[]): void {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed) output.push(trimmed);
    return;
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      collectAgentReplyTextFragments(item, output);
    }
    return;
  }

  const obj = asObject(input);
  if (!obj) return;

  const type = normalizeAgentTurnStopReason(asString(obj.type));
  if (type?.startsWith("tool")) {
    return;
  }

  const directText = asString(obj.text)?.trim();
  if (directText) output.push(directText);

  const directContent = asString(obj.content)?.trim();
  if (directContent) output.push(directContent);

  const directMessage = asString(obj.message)?.trim();
  if (directMessage) output.push(directMessage);

  if (!directContent && obj.content !== undefined) {
    collectAgentReplyTextFragments(obj.content, output);
  }
  if (!directMessage && obj.message !== undefined) {
    collectAgentReplyTextFragments(obj.message, output);
  }
  if (obj.parts !== undefined) {
    collectAgentReplyTextFragments(obj.parts, output);
  }
}

function extractAgentReplyText(input: unknown): string {
  const collected: string[] = [];
  for (const root of resolveAgentTurnResultObjects(input)) {
    for (const payload of extractAgentTurnPayloads(root)) {
      collectAgentReplyTextFragments(payload, collected);
    }
  }
  if (collected.length > 0) return collected.join("\n\n").trim();

  for (const root of resolveAgentTurnResultObjects(input)) {
    const topLevelText =
      asString(root.replyText) ??
      asString(root.text) ??
      asString(root.message) ??
      asString(root.content);
    if (topLevelText?.trim()) {
      return topLevelText.trim();
    }
  }

  return "";
}

interface AgentTurnCompletion {
  stopReason?: string;
  errorMessage?: string;
  incomplete: boolean;
}

interface RecoveredAssistantReply {
  replyText: string;
  stopReason?: string;
  timestampMs: number;
}

function inspectAgentTurnCompletion(input: unknown): AgentTurnCompletion {
  const roots = resolveAgentTurnResultObjects(input);
  const stopReason = roots
    .map((root) =>
      asString(root.stopReason) ??
      asString(root.stop_reason) ??
      asString(asObject(root.meta)?.stopReason) ??
      asString(asObject(root.meta)?.stop_reason),
    )
    .find((value) => value?.trim());
  const errorMessage = roots
    .map((root) =>
      asString(root.errorMessage) ??
      asString(root.error_message) ??
      asString(asObject(root.meta)?.errorMessage) ??
      asString(asObject(root.meta)?.error_message) ??
      asString(asObject(root.error)?.message) ??
      asString(asObject(root.error)?.error),
    )
    .find((value) => value?.trim());
  const normalizedStopReason = normalizeAgentTurnStopReason(stopReason);
  const visibleReplyText = extractAgentReplyText(input);
  const combinedSignalText = joinNonEmptyText(errorMessage, visibleReplyText);
  const aborted = roots.some(
    (root) => asBoolean(root.aborted) === true || asBoolean(asObject(root.meta)?.aborted) === true,
  );
  const payloads = roots.flatMap((root) => extractAgentTurnPayloads(root));
  const incomplete =
    aborted ||
    normalizedStopReason === "aborted" ||
    normalizedStopReason === "interrupted" ||
    normalizedStopReason === "cancelled" ||
    normalizedStopReason === "canceled" ||
    normalizedStopReason === "tooluse" ||
    normalizedStopReason === "toolcall" ||
    /request was aborted|turn was aborted|was aborted|cancelled|canceled|request timed out before a response was generated|timed out before a response was generated/i.test(
      combinedSignalText,
    ) ||
    (!visibleReplyText.trim() && payloadsContainToolCall(payloads));
  return {
    stopReason: stopReason?.trim() || undefined,
    errorMessage: errorMessage?.trim() || undefined,
    incomplete,
  };
}

function normalizeAgentTurnStopReason(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const normalized = input.trim().toLowerCase().replace(/[^a-z]+/g, "");
  return normalized || undefined;
}

function payloadsContainToolCall(input: unknown): boolean {
  if (!Array.isArray(input)) return false;
  return input.some((payload) => valueContainsToolCall(payload));
}

function valueContainsToolCall(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  if (Array.isArray(input)) return input.some((item) => valueContainsToolCall(item));
  const obj = input as Record<string, unknown>;
  if (obj.type === "toolCall") return true;
  return Object.values(obj).some((value) => valueContainsToolCall(value));
}

function shouldRetryTemporary502AgentTurn(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): boolean {
  if (response.ok) return false;
  const haystacks = buildAgentTurnRetryHaystack(response);
  if (!haystacks) return false;
  return looksLikeRetryableUpstreamProviderError(haystacks);
}

function shouldFailOverToFallbackModel(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): boolean {
  if (!response.ok) {
    return looksLikeRetryableUpstreamProviderError(buildAgentTurnRetryHaystack(response));
  }
  return looksLikeVisibleUpstreamFailureReply(response.replyText);
}

function looksLikeRetryableUpstreamProviderError(input: string | undefined): boolean {
  const normalized = input?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  if (/\bhttp\s*(502|503|521|522|524|529)\b/.test(normalized)) return true;
  if (/\berror code\s*(502|503|521|522|524|529)\b/.test(normalized)) return true;
  if (
    /\b(502|503|521|522|524|529)\b/.test(normalized) &&
    /(bad gateway|gateway timeout|temporarily unavailable|service unavailable|upstream)/.test(normalized)
  ) {
    return true;
  }
  if (normalized.includes("the ai service is temporarily unavailable")) return true;
  if (normalized.includes("an error occurred while processing your request")) return true;
  return normalized.includes("help.openai.com") && normalized.includes("request id");
}

function looksLikeVisibleUpstreamFailureReply(input: string | undefined): boolean {
  const normalized = input?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  if (normalized.startsWith("the ai service is temporarily unavailable")) return true;
  if (normalized.startsWith("an error occurred while processing your request")) return true;
  if (!looksLikeRetryableUpstreamProviderError(normalized)) return false;
  return (
    normalized.length <= 240 &&
    /(temporarily unavailable|service unavailable|bad gateway|gateway timeout|help.openai.com|request id)/.test(
      normalized,
    )
  );
}

function shouldRetryTransientAgentTurn(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson" | "runId">,
): boolean {
  if (response.ok) return false;
  if (response.runId) return false;
  const haystacks = buildAgentTurnRetryHaystack(response);
  if (!haystacks) return false;
  if (/(session file locked|resource busy|ebusy|\bfile is locked\b)/i.test(haystacks)) {
    return true;
  }
  if (
    /(gateway not connected|gateway closed|no close reason|failovererror)/i.test(haystacks) &&
    /(session file locked|resource busy|ebusy|gateway not connected|gateway closed)/i.test(haystacks)
  ) {
    return true;
  }
  return false;
}

async function maybeRecoverTransientAgentTurnFailure(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): Promise<{ clearedStaleLock: boolean; lockPath?: string }> {
  const details = parseSessionLockFailureDetails(buildAgentTurnRetryHaystack(response));
  if (!details.lockPath) {
    return { clearedStaleLock: false };
  }
  const clearedStaleLock = await maybeClearStaleSessionLock(details);
  return {
    clearedStaleLock,
    lockPath: clearedStaleLock ? details.lockPath : undefined,
  };
}

async function maybeSwapAgentTurnToFallbackModel(agentId: string) {
  try {
    return await swapOpenClawAgentToFallbackModel(agentId);
  } catch (error) {
    console.warn(
      `[openclaw] failed to switch ${agentId} to a fallback model: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function buildAgentTurnRetryHaystack(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): string {
  return [
    response.failureReason,
    response.replyText,
    response.rawText,
    response.rawJson ? JSON.stringify(response.rawJson) : "",
  ]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join("\n")
    .toLowerCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSessionLockFailureDetails(input: string): SessionLockFailureDetails {
  const lockPathMatch = /((?:[a-z]:\\|\/)[^\r\n]*?\.jsonl\.lock)/i.exec(input);
  const pidMatch = /\bpid\s*[=:]\s*(\d+)/i.exec(input);
  return {
    lockPath: normalizeAgentSessionLockPath(lockPathMatch?.[1]),
    ownerPid: normalizePid(pidMatch?.[1]),
  };
}

async function maybeClearStaleSessionLock(
  details: SessionLockFailureDetails,
  options?: {
    minAgeMs?: number;
    forceAgeMs?: number;
  },
): Promise<boolean> {
  const lockPath = normalizeAgentSessionLockPath(details.lockPath);
  if (!lockPath) return false;

  let fileStat;
  try {
    fileStat = await stat(lockPath);
  } catch {
    return false;
  }
  if (!fileStat.isFile()) return false;

  const lockMetadata = await readSessionLockMetadata(lockPath);
  const lockTimestampMs = lockMetadata.createdAtMs ?? fileStat.mtimeMs;
  const ageMs = Math.max(0, Date.now() - lockTimestampMs);
  const minAgeMs = options?.minAgeMs ?? AGENT_TURN_STALE_LOCK_MIN_AGE_MS;
  const forceAgeMs = options?.forceAgeMs ?? AGENT_TURN_STALE_LOCK_FORCE_AGE_MS;
  if (ageMs < minAgeMs) return false;

  const ownerPid = details.ownerPid ?? lockMetadata.ownerPid;
  const ownerRunning = ownerPid === undefined ? undefined : isProcessLikelyRunning(ownerPid);
  if (ownerRunning === true) return false;
  if (ownerRunning !== false && ageMs < forceAgeMs) return false;

  try {
    await unlink(lockPath);
    return true;
  } catch {
    return false;
  }
}

async function readSessionLockMetadata(lockPath: string): Promise<SessionLockMetadata> {
  try {
    const contents = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(contents) as unknown;
    const record = asObject(parsed);
    if (!record) {
      return {
        ownerPid: normalizePid(/\bpid\b["'\s:=]+(\d+)/i.exec(contents)?.[1]),
      };
    }
    return {
      ownerPid: normalizePid(asString(record.pid) ?? asNumberString(record.pid)),
      createdAtMs: normalizeTimestamp(record.createdAt),
      startTime: asString(record.starttime) ?? asString(record.startTime),
    };
  } catch {
    return {};
  }
}

function isProcessLikelyRunning(pid: number): boolean | undefined {
  if (!Number.isInteger(pid) || pid <= 0) return undefined;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    return undefined;
  }
}

function normalizeAgentSessionLockPath(lockPath: string | undefined): string | undefined {
  const trimmed = lockPath?.trim();
  if (!trimmed) return undefined;
  const resolvedLockPath = resolve(trimmed);
  if (!resolvedLockPath.toLowerCase().endsWith(".jsonl.lock")) return undefined;

  const sessionsRoot = resolve(resolveOpenClawHomePath(), "agents");
  const relativePath = relative(sessionsRoot, resolvedLockPath);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return undefined;
  }

  const parts = relativePath.split(/[\\/]+/).filter((part) => part !== "");
  if (parts.length < 3 || parts[1]?.toLowerCase() !== "sessions") {
    return undefined;
  }
  return resolvedLockPath;
}

function normalizePid(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const parsed = Number.parseInt(input, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeTimestamp(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input > 1_000_000_000_000 ? input : input * 1_000;
  }
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const asNumber = Number.parseFloat(trimmed);
  if (Number.isFinite(asNumber)) {
    return asNumber > 1_000_000_000_000 ? asNumber : asNumber * 1_000;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asNumberString(value: unknown): string | undefined {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
}

export function shouldRetryTemporary502AgentTurnForSmoke(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): boolean {
  return shouldRetryTemporary502AgentTurn(response);
}

export function shouldRetryTransientAgentTurnForSmoke(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): boolean {
  return shouldRetryTransientAgentTurn(response);
}

export function shouldFailOverToFallbackModelForSmoke(
  response: Pick<AgentTurnResponse, "ok" | "failureReason" | "replyText" | "rawText" | "rawJson">,
): boolean {
  return shouldFailOverToFallbackModel(response);
}

export function parseSessionLockFailureDetailsForSmoke(input: string): {
  lockPath?: string;
  ownerPid?: number;
} {
  return parseSessionLockFailureDetails(input);
}

export async function maybeClearStaleSessionLockForSmoke(
  input: string,
  options?: {
    minAgeMs?: number;
    forceAgeMs?: number;
  },
): Promise<boolean> {
  return await maybeClearStaleSessionLock(parseSessionLockFailureDetails(input), options);
}

export function inspectAgentTurnCompletionForSmoke(input: unknown): {
  stopReason?: string;
  errorMessage?: string;
  incomplete: boolean;
} {
  return inspectAgentTurnCompletion(input);
}

export function buildAgentTurnCliArgsForSmoke(input: AgentTurnAttemptInput): string[] {
  return buildAgentTurnCliArgs(input);
}

export function resolveRequestedAgentTurnSessionBindingForSmoke(
  agentId: string,
  beforeSessions: SessionsListResponse,
  preferredSessionId?: string,
  preferredSessionKey?: string,
): ResolvedAgentTurnSessionBinding {
  return resolveRequestedAgentTurnSessionBinding(agentId, beforeSessions, preferredSessionId, preferredSessionKey);
}

function parseEmbeddedJson(input: string): unknown {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Some OpenClaw commands print logs before the JSON payload.
  }

  const candidateStarts: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const ch = input[index];
    if (ch === "{" || ch === "[") candidateStarts.push(index);
  }

  for (const start of candidateStarts) {
    const candidate = input.slice(start).trim();
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      continue;
    }
  }
  return undefined;
}

function extractSessionRecords(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed.flatMap((item) => (asObject(item) ? [item] : []));

  const root = asObject(parsed);
  if (!root) return [];

  const nestedCollections = [root.sessions, root.items, root.records];
  for (const collection of nestedCollections) {
    if (!Array.isArray(collection)) continue;
    const records = collection.flatMap((item) => (asObject(item) ? [item] : []));
    if (records.length > 0) return records;
  }

  return Object.entries(root).flatMap(([key, value]) => {
    const record = asObject(value);
    if (!record) return [];
    return [{ key, ...record }];
  });
}

function mergeSessionLists(
  primary: NonNullable<SessionsListResponse["sessions"]> = [],
  secondary: NonNullable<SessionsListResponse["sessions"]> = [],
): NonNullable<SessionsListResponse["sessions"]> {
  const merged = new Map<string, NonNullable<SessionsListResponse["sessions"]>[number]>();

  const mergeItem = (item: NonNullable<SessionsListResponse["sessions"]>[number]): void => {
    const sessionKey = item.sessionKey ?? item.key;
    if (!sessionKey) return;
    const current = merged.get(sessionKey);
    if (!current) {
      merged.set(sessionKey, item);
      return;
    }
    merged.set(sessionKey, {
      ...current,
      ...item,
      sessionKey,
      key: item.key ?? current.key ?? sessionKey,
      sessionFile: item.sessionFile ?? current.sessionFile,
      sessionId: item.sessionId ?? current.sessionId,
      agentId: item.agentId ?? current.agentId,
      updatedAtMs: Math.max(current.updatedAtMs ?? 0, item.updatedAtMs ?? 0) || undefined,
      active: item.active ?? current.active ?? false,
      state: item.state ?? current.state,
      model: item.model ?? current.model,
      inputTokens: item.inputTokens ?? current.inputTokens,
      outputTokens: item.outputTokens ?? current.outputTokens,
      totalTokens: item.totalTokens ?? current.totalTokens,
    });
  };

  for (const item of secondary) mergeItem(item);
  for (const item of primary) mergeItem(item);

  return [...merged.values()].sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
}

function isSessionActive(item: Record<string, unknown>, updatedAtMs: number): boolean {
  const explicitActive = asBoolean(item.active) ?? asBoolean(item.isActive);
  if (typeof explicitActive === "boolean") return explicitActive;

  const explicitState = readSessionState(item);
  if (explicitState) {
    if (ACTIVE_SESSION_STATES.has(explicitState)) return true;
    if (INACTIVE_SESSION_STATES.has(explicitState)) return false;
  }

  if (!Number.isFinite(updatedAtMs)) return false;
  return Date.now() - updatedAtMs <= FALLBACK_ACTIVE_RECENCY_WINDOW_MS;
}

function readSessionState(item: Record<string, unknown>): string | undefined {
  const direct =
    asString(item.state) ??
    asString(item.status) ??
    asString(item.runState) ??
    asString(item.lifecycleState);
  if (direct) return direct.trim().toLowerCase();

  const acp = asObject(item.acp);
  const acpState = asString(acp?.state);
  return acpState ? acpState.trim().toLowerCase() : undefined;
}

function readUpdatedAtMs(item: Record<string, unknown>): number {
  const candidates = [
    item.updatedAt,
    item.lastActivityAt,
    item.createdAt,
    asObject(item.acp)?.lastActivityAt,
    asObject(item.acp)?.updatedAt,
    asObject(item.acp)?.createdAt,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return normalizeEpochMs(candidate);
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const trimmed = candidate.trim();
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return normalizeEpochMs(numeric);
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return Number.NaN;
}

function normalizeEpochMs(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1e14) return value / 1000;
  if (abs > 0 && abs < 1e12) return value * 1000;
  return value;
}

function buildSessionFilePath(
  openclawHome: string,
  agentId: string | undefined,
  sessionId: string | undefined,
): string | undefined {
  if (!agentId || !sessionId) return undefined;
  return join(openclawHome, "agents", agentId, "sessions", `${sessionId}.jsonl`);
}

function extractAgentIdFromSessionKey(sessionKey: string | undefined): string | undefined {
  const value = sessionKey?.trim();
  if (!value) return undefined;
  const match = /^agent:([^:]+):/i.exec(value);
  return match?.[1];
}

function matchesConfiguredAgents(agentId: string | undefined, configuredAgentKeys: ReadonlySet<string>): boolean {
  if (configuredAgentKeys.size === 0) return true;
  const normalized = normalizeAgentKey(agentId);
  return normalized.length > 0 && configuredAgentKeys.has(normalized);
}

function normalizeAgentKey(agentId: string | undefined): string {
  return agentId?.trim().toLowerCase() ?? "";
}

function normalizeSessionKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function assertApprovalActionsEnabled(action: "approve" | "reject"): void {
  if (APPROVAL_ACTIONS_ENABLED) return;
  throw new Error(
    `approvals ${action} is disabled by safety gate (APPROVAL_ACTIONS_ENABLED=${String(
      APPROVAL_ACTIONS_ENABLED,
    )}).`,
  );
}
