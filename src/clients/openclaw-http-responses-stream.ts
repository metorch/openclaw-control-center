import { readFile } from "node:fs/promises";
import type { AgentTurnStreamEvent } from "../contracts/openclaw-tools";
import { resolveOpenClawConfigPath } from "../runtime/current-agent-catalog";

const DEFAULT_GATEWAY_HTTP_URL = "http://127.0.0.1:18789";
const DEFAULT_GATEWAY_PORT = 18_789;
const HTTP_RESPONSES_CONNECT_TIMEOUT_MS = 10_000;
const HTTP_RESPONSES_FINAL_GRACE_MS = 30_000;

interface OpenClawHttpResponsesStreamRequest {
  agentId: string;
  message: string;
  sessionKey?: string;
  timeoutSeconds: number;
  onStreamEvent?: (event: AgentTurnStreamEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

export interface OpenClawHttpResponsesStreamResult {
  started: boolean;
  runId?: string;
  replyText: string;
  stopReason?: string;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
}

interface GatewayConnectionConfig {
  url: string;
  token?: string;
  password?: string;
}

interface ParsedSseEvent {
  event?: string;
  data: string;
}

export class HttpResponsesStreamStartError extends Error {
  readonly code = "HTTP_RESPONSES_STREAM_START_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "HttpResponsesStreamStartError";
  }
}

export async function streamOpenClawHttpResponsesAgentTurn(
  request: OpenClawHttpResponsesStreamRequest,
): Promise<OpenClawHttpResponsesStreamResult> {
  const connection = await resolveGatewayHttpConnectionConfig();
  const controller = new AbortController();
  const streamUrl = new URL("/v1/responses", connection.url).toString();
  const streamBody = JSON.stringify({
    model: `openclaw:${request.agentId}`,
    stream: true,
    input: [
      {
        type: "message",
        role: "user",
        content: request.message,
      },
    ],
  });

  let abortMessage = "";
  let connectTimer: NodeJS.Timeout | undefined;
  let finalTimer: NodeJS.Timeout | undefined;
  let runStarted = false;
  let runId: string | undefined;
  let lastText = "";
  let lastPayload: Record<string, unknown> | undefined;
  let stopReason: string | undefined;
  let externalAbortMessage = "";

  const emitStreamEvent = async (event: AgentTurnStreamEvent): Promise<void> => {
    if (!request.onStreamEvent) {
      return;
    }
    try {
      await request.onStreamEvent(event);
    } catch {
      // Streaming callbacks should never break the underlying turn.
    }
  };

  const cleanup = (): void => {
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = undefined;
    }
    if (finalTimer) {
      clearTimeout(finalTimer);
      finalTimer = undefined;
    }
  };

  const handleExternalAbort = (): void => {
    externalAbortMessage = resolveAbortSignalMessage(request.signal);
    controller.abort(externalAbortMessage);
  };

  if (request.signal) {
    if (request.signal.aborted) {
      handleExternalAbort();
    } else {
      request.signal.addEventListener("abort", handleExternalAbort, { once: true });
    }
  }

  const scheduleConnectTimeout = (): void => {
    connectTimer = setTimeout(() => {
      abortMessage = "Timed out while opening the upstream responses stream.";
      controller.abort();
    }, HTTP_RESPONSES_CONNECT_TIMEOUT_MS);
    connectTimer.unref?.();
  };

  const scheduleFinalTimeout = (): void => {
    if (finalTimer) {
      clearTimeout(finalTimer);
    }
    finalTimer = setTimeout(() => {
      abortMessage = "Responses stream timed out before a final event arrived.";
      controller.abort();
    }, Math.max(1_000, request.timeoutSeconds * 1_000 + HTTP_RESPONSES_FINAL_GRACE_MS));
    finalTimer.unref?.();
  };

  const ensureStarted = async (payload?: Record<string, unknown>): Promise<void> => {
    if (runStarted) {
      return;
    }
    runStarted = true;
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = undefined;
    }
    scheduleFinalTimeout();
    await emitStreamEvent({
      state: "started",
      agentId: request.agentId,
      runId,
      sessionKey: request.sessionKey,
      rawPayload: payload,
    });
  };

  const finalizeWithError = async (message: string): Promise<OpenClawHttpResponsesStreamResult> => {
    await emitStreamEvent({
      state: "error",
      agentId: request.agentId,
      runId,
      sessionKey: request.sessionKey,
      text: lastText || undefined,
      errorMessage: message,
      rawPayload: lastPayload,
    });
    return {
      started: true,
      runId,
      replyText: lastText,
      stopReason,
      errorMessage: message,
      rawPayload: lastPayload,
    };
  };

  const handleParsedEvent = async (
    parsedEvent: ParsedSseEvent,
  ): Promise<OpenClawHttpResponsesStreamResult | undefined> => {
    if (parsedEvent.data === "[DONE]") {
      return undefined;
    }
    const rawPayload = parseJsonRecord(parsedEvent.data);
    const eventType = parsedEvent.event || asString(rawPayload?.type);
    if (!eventType) {
      return undefined;
    }

    const responsePayload = asObject(rawPayload?.response);
    if (responsePayload) {
      runId = asString(responsePayload.id) ?? runId;
      lastPayload = responsePayload;
    } else if (rawPayload) {
      lastPayload = rawPayload;
    }

    if (eventType === "response.created" || eventType === "response.in_progress") {
      await ensureStarted(responsePayload ?? rawPayload);
      return undefined;
    }

    if (eventType === "response.output_text.delta") {
      await ensureStarted(rawPayload);
      const deltaText = asString(rawPayload?.delta) ?? "";
      const nextText = asString(rawPayload?.text) ?? "";
      if (hasNonWhitespaceText(deltaText)) {
        lastText = appendUniqueSuffix(lastText, deltaText);
      } else if (hasNonWhitespaceText(nextText)) {
        lastText = nextText;
      }
      await emitStreamEvent({
        state: "delta",
        agentId: request.agentId,
        runId,
        sessionKey: request.sessionKey,
        text: lastText || undefined,
        deltaText: deltaText || undefined,
        rawPayload,
      });
      return undefined;
    }

    if (eventType === "response.output_text.done") {
      await ensureStarted(rawPayload);
      const doneText = asString(rawPayload?.text) ?? "";
      if (hasNonWhitespaceText(doneText)) {
        lastText = doneText;
      }
      return undefined;
    }

    if (eventType === "response.completed") {
      await ensureStarted(responsePayload ?? rawPayload);
      const responseText = extractResponseOutputText(responsePayload);
      if (hasNonWhitespaceText(responseText)) {
        lastText = responseText;
      }
      stopReason = resolveResponsesStopReason(responsePayload);
      await emitStreamEvent({
        state: "final",
        agentId: request.agentId,
        runId,
        sessionKey: request.sessionKey,
        text: lastText || undefined,
        stopReason,
        rawPayload: responsePayload ?? rawPayload,
      });
      return {
        started: true,
        runId,
        replyText: lastText,
        stopReason,
        rawPayload: responsePayload ?? rawPayload,
      };
    }

    if (eventType === "response.failed") {
      await ensureStarted(responsePayload ?? rawPayload);
      const responseText = extractResponseOutputText(responsePayload);
      if (hasNonWhitespaceText(responseText)) {
        lastText = responseText;
      }
      stopReason = resolveResponsesStopReason(responsePayload);
      const errorMessage =
        asString(asObject(responsePayload?.error)?.message) ||
        asString(asObject(rawPayload?.error)?.message) ||
        asString(asObject(rawPayload?.error)?.code) ||
        "Responses stream returned an error.";
      return await finalizeWithError(errorMessage);
    }

    return undefined;
  };

  scheduleConnectTimeout();

  try {
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: buildResponsesHeaders(connection, request),
      body: streamBody,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpResponsesStreamStartError(await resolveResponsesStartFailure(response));
    }
    if (!response.body) {
      throw new HttpResponsesStreamStartError("Upstream /v1/responses returned no response body.");
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("text/event-stream")) {
      throw new HttpResponsesStreamStartError(
        await resolveUnexpectedResponsesContentTypeFailure(response, contentType),
      );
    }

    const decoder = new TextDecoder();
    let buffered = "";
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
      buffered += decoder.decode(chunk, { stream: true });
      const blocks = takeSseBlocks(buffered);
      buffered = blocks.rest;
      for (const block of blocks.blocks) {
        const parsedEvent = parseSseBlock(block);
        if (!parsedEvent) {
          continue;
        }
        const resolved = await handleParsedEvent(parsedEvent);
        if (resolved) {
          return resolved;
        }
      }
    }

    buffered += decoder.decode();
    const trailingBlock = buffered.trim();
    if (trailingBlock) {
      const parsedEvent = parseSseBlock(trailingBlock);
      if (parsedEvent) {
        const resolved = await handleParsedEvent(parsedEvent);
        if (resolved) {
          return resolved;
        }
      }
    }
  } catch (error) {
    const aborted = controller.signal.aborted || request.signal?.aborted === true;
    const message = aborted
      ? externalAbortMessage || abortMessage || resolveAbortSignalMessage(request.signal)
      : resolveResponsesErrorMessage(error, abortMessage);
    if (aborted) {
      stopReason = "cancelled";
    }
    if (!runStarted) {
      cleanup();
      if (aborted) {
        return {
          started: false,
          runId,
          replyText: lastText,
          stopReason,
          errorMessage: message,
          rawPayload: lastPayload,
        };
      }
      throw new HttpResponsesStreamStartError(message);
    }
    const resolved = await finalizeWithError(message);
    cleanup();
    return resolved;
  } finally {
    if (request.signal) {
      request.signal.removeEventListener("abort", handleExternalAbort);
    }
    cleanup();
  }

  if (!runStarted) {
    throw new HttpResponsesStreamStartError(
      "Upstream /v1/responses closed before any streaming events arrived.",
    );
  }
  return await finalizeWithError("Responses stream closed before a final event arrived.");
}

function resolveAbortSignalMessage(signal?: AbortSignal): string {
  const reason = signal?.reason;
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message.trim();
  }
  return "Agent turn was cancelled.";
}

function buildResponsesHeaders(
  connection: GatewayConnectionConfig,
  request: OpenClawHttpResponsesStreamRequest,
): HeadersInit {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "text/event-stream",
    "x-openclaw-agent-id": request.agentId,
  };
  if (request.sessionKey?.trim()) {
    headers["x-openclaw-session-key"] = request.sessionKey.trim();
  }
  const bearer = connection.token || connection.password;
  if (bearer) {
    headers.authorization = `Bearer ${bearer}`;
  }
  return headers;
}

async function resolveGatewayHttpConnectionConfig(): Promise<GatewayConnectionConfig> {
  const config = await readGatewayConfigSnapshot();
  const gateway = asObject(config?.gateway);
  const remote = asObject(gateway?.remote);
  const gatewayAuth = asObject(gateway?.auth);
  const isRemoteMode = asString(gateway?.mode)?.toLowerCase() === "remote";
  const envUrl =
    readEnvString(["GATEWAY_URL", "OPENCLAW_GATEWAY_URL", "CLAWDBOT_GATEWAY_URL"]) ||
    undefined;
  const configUrl = isRemoteMode ? asString(remote?.url) : asString(remote?.url) || undefined;
  const tlsEnabled = asBoolean(asObject(gateway?.tls)?.enabled) === true;
  const configuredPort = asNumber(gateway?.port);
  const localUrl = `${tlsEnabled ? "https" : "http"}://127.0.0.1:${
    Number.isFinite(configuredPort) && configuredPort! > 0 ? Math.trunc(configuredPort!) : DEFAULT_GATEWAY_PORT
  }`;
  const url = normalizeGatewayHttpUrl(envUrl || configUrl || localUrl);

  const envToken = readEnvString(["OPENCLAW_GATEWAY_TOKEN", "CLAWDBOT_GATEWAY_TOKEN", "GATEWAY_TOKEN"]);
  const envPassword = readEnvString([
    "OPENCLAW_GATEWAY_PASSWORD",
    "CLAWDBOT_GATEWAY_PASSWORD",
    "GATEWAY_PASSWORD",
  ]);
  const configToken = isRemoteMode
    ? readCredential(remote?.token) || readCredential(gatewayAuth?.token)
    : readCredential(gatewayAuth?.token) || readCredential(remote?.token);
  const configPassword = isRemoteMode
    ? readCredential(remote?.password) || readCredential(gatewayAuth?.password)
    : readCredential(gatewayAuth?.password) || readCredential(remote?.password);

  return {
    url,
    token: envToken || configToken,
    password: envPassword || configPassword,
  };
}

async function readGatewayConfigSnapshot(): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await readFile(resolveOpenClawConfigPath(), "utf8")) as unknown;
    return asObject(parsed);
  } catch {
    return undefined;
  }
}

function normalizeGatewayHttpUrl(input: string): string {
  const trimmed = input.trim() || DEFAULT_GATEWAY_HTTP_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "ws:") {
      parsed.protocol = "http:";
    } else if (parsed.protocol === "wss:") {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function takeSseBlocks(input: string): { blocks: string[]; rest: string } {
  const parts = input.split(/\r?\n\r?\n/g);
  if (parts.length <= 1) {
    return { blocks: [], rest: input };
  }
  const rest = parts.pop() ?? "";
  return {
    blocks: parts.filter((part) => part.trim().length > 0),
    rest,
  };
}

function parseSseBlock(block: string): ParsedSseEvent | undefined {
  const lines = block.split(/\r?\n/g);
  let eventName: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim() || undefined;
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) {
    return undefined;
  }
  return {
    event: eventName,
    data: dataLines.join("\n"),
  };
}

async function resolveResponsesStartFailure(response: Response): Promise<string> {
  const snippet = extractFirstVisibleSnippet(await response.text());
  return joinNonEmptyText(
    `Upstream /v1/responses stream failed to start (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`,
    snippet,
  );
}

async function resolveUnexpectedResponsesContentTypeFailure(
  response: Response,
  contentType: string,
): Promise<string> {
  const snippet = extractFirstVisibleSnippet(await response.text());
  return joinNonEmptyText(
    `Upstream /v1/responses returned ${contentType} instead of text/event-stream.`,
    snippet,
  );
}

function resolveResponsesErrorMessage(error: unknown, abortMessage: string): string {
  if (error instanceof HttpResponsesStreamStartError) {
    return error.message;
  }
  if (abortMessage) {
    return abortMessage;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "Responses stream failed before a final event arrived.";
}

function extractFirstVisibleSnippet(input: string): string {
  const withoutTags = input.replace(/<[^>]+>/g, " ");
  const line = withoutTags
    .split(/\r?\n/g)
    .map((value) => value.trim())
    .find(Boolean);
  if (!line) {
    return "";
  }
  return line.length > 200 ? `${line.slice(0, 200).trim()}...` : line;
}

function extractResponseOutputText(responsePayload: Record<string, unknown> | undefined): string {
  const output = Array.isArray(responsePayload?.output) ? responsePayload.output : [];
  for (const item of output) {
    const message = asObject(item);
    if (!message || asString(message.type) !== "message") {
      continue;
    }
    const content = Array.isArray(message.content) ? message.content : [];
    const text = content
      .flatMap((part) => {
        const entry = asObject(part);
        const type = asString(entry?.type);
        const value = asString(entry?.text);
        return type === "output_text" && hasNonWhitespaceText(value) ? [value] : [];
      })
      .join("\n")
      .trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function resolveResponsesStopReason(responsePayload: Record<string, unknown> | undefined): string | undefined {
  const status = asString(responsePayload?.status)?.trim().toLowerCase();
  if (!status) {
    return undefined;
  }
  if (status === "incomplete" && responseHasFunctionCallOutput(responsePayload)) {
    return "toolUse";
  }
  if (status === "cancelled" || status === "canceled") {
    return "cancelled";
  }
  if (status === "failed") {
    return "error";
  }
  return status;
}

function responseHasFunctionCallOutput(responsePayload: Record<string, unknown> | undefined): boolean {
  const output = Array.isArray(responsePayload?.output) ? responsePayload.output : [];
  return output.some((item) => asString(asObject(item)?.type) === "function_call");
}

function appendUniqueSuffix(base: string, suffix: string): string {
  if (!base) {
    return suffix;
  }
  if (!suffix || base.endsWith(suffix)) {
    return base;
  }
  const maxOverlap = Math.min(base.length, suffix.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (base.slice(-overlap) === suffix.slice(0, overlap)) {
      return base + suffix.slice(overlap);
    }
  }
  return base + suffix;
}

function joinNonEmptyText(...values: Array<string | undefined>): string {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function hasNonWhitespaceText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseJsonRecord(input: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(input) as unknown;
    return asObject(parsed);
  } catch {
    return undefined;
  }
}

function readEnvString(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function readCredential(input: unknown): string | undefined {
  return asString(input)?.trim() || undefined;
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function asNumber(input: unknown): number | undefined {
  return typeof input === "number" && Number.isFinite(input) ? input : undefined;
}

function asBoolean(input: unknown): boolean | undefined {
  return typeof input === "boolean" ? input : undefined;
}
