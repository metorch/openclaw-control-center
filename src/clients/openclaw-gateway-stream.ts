import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import type { AgentTurnStreamEvent } from "../contracts/openclaw-tools";
import { resolveOpenClawConfigPath } from "../runtime/current-agent-catalog";

const DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18789";
const DEFAULT_GATEWAY_PORT = 18_789;
const GATEWAY_PROTOCOL_VERSION = 3;
const GATEWAY_CONNECT_TIMEOUT_MS = 10_000;
const GATEWAY_FINAL_GRACE_MS = 30_000;
const CONTROL_CENTER_CLIENT_ID = "gateway-client";
const CONTROL_CENTER_CLIENT_MODE = "backend";
const CONTROL_CENTER_CLIENT_VERSION = "control-center";
const CONTROL_CENTER_CLIENT_DISPLAY_NAME = "OpenClaw Control Center";
const CONTROL_CENTER_OPERATOR_ROLE = "operator";
const CONTROL_CENTER_OPERATOR_SCOPES = [
  "operator.admin",
  "operator.read",
  "operator.write",
] as const;
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

interface OpenClawGatewayStreamRequest {
  agentId: string;
  message: string;
  sessionKey: string;
  timeoutSeconds: number;
  onStreamEvent?: (event: AgentTurnStreamEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

export interface OpenClawGatewayAbortRequest {
  sessionKey: string;
  runId?: string;
  timeoutMs?: number;
}

export interface OpenClawGatewayStreamResult {
  started: boolean;
  runId?: string;
  replyText: string;
  stopReason?: string;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
}

export interface OpenClawGatewayAbortResult {
  ok: boolean;
  aborted: boolean;
  runIds: string[];
  rawPayload?: Record<string, unknown>;
}

interface GatewayConnectionConfig {
  openClawHomeDir: string;
  url: string;
  token?: string;
  password?: string;
  deviceToken?: string;
  deviceIdentity?: GatewayDeviceIdentity;
}

interface GatewayDeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface GatewayStoredDeviceAuthToken {
  token: string;
  scopes: string[];
}

interface GatewayWebSocketLike {
  readyState?: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
  onopen?: ((event: unknown) => void) | null;
  onmessage?: ((event: { data?: unknown }) => void) | null;
  onclose?: ((event: { code?: number; reason?: string }) => void) | null;
  onerror?: ((event: unknown) => void) | null;
}

type GatewayWebSocketCtor = new (url: string) => GatewayWebSocketLike;

export class GatewayStreamStartError extends Error {
  readonly code = "GATEWAY_STREAM_START_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "GatewayStreamStartError";
  }
}

export async function streamOpenClawGatewayAgentTurn(
  request: OpenClawGatewayStreamRequest,
): Promise<OpenClawGatewayStreamResult> {
  const connection = await resolveGatewayConnectionConfig();
  const WebSocketCtor = resolveWebSocketCtor();
  const socket = new WebSocketCtor(connection.url);
  const connectRequestId = randomUUID();
  const chatRequestId = randomUUID();
  const clientRunId = randomUUID();

  let settled = false;
  let runStarted = false;
  let connectSent = false;
  let chatSendSent = false;
  let runId: string | undefined;
  let lastText = "";
  let lastPayload: Record<string, unknown> | undefined;
  let externalAbortMessage = "";
  let connectTimer: NodeJS.Timeout | undefined;
  let finalTimer: NodeJS.Timeout | undefined;

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
    try {
      socket.close();
    } catch {
      // Ignore close races.
    }
  };

  const handleExternalAbort = (): void => {
    if (settled) {
      return;
    }
    externalAbortMessage = resolveAbortSignalMessage(request.signal);
    void emitStreamEvent({
      state: "error",
      agentId: request.agentId,
      runId,
      sessionKey: request.sessionKey,
      text: lastText || undefined,
      errorMessage: externalAbortMessage,
      rawPayload: lastPayload,
    });
    resolveOnce({
      started: runStarted,
      runId,
      replyText: lastText,
      stopReason: "cancelled",
      errorMessage: externalAbortMessage,
      rawPayload: lastPayload,
    });
  };

  const setFinalTimer = (): void => {
    if (finalTimer) {
      clearTimeout(finalTimer);
    }
    finalTimer = setTimeout(() => {
      const message = "Gateway chat stream timed out before a final event arrived.";
      if (!runStarted) {
        rejectOnce(new GatewayStreamStartError(message));
        return;
      }
      void emitStreamEvent({
        state: "error",
        agentId: request.agentId,
        runId,
        sessionKey: request.sessionKey,
        text: lastText || undefined,
        errorMessage: message,
      });
      resolveOnce({
        started: true,
        runId,
        replyText: lastText,
        errorMessage: message,
        rawPayload: lastPayload,
      });
    }, Math.max(1_000, request.timeoutSeconds * 1_000 + GATEWAY_FINAL_GRACE_MS));
    finalTimer.unref?.();
  };

  let resolvePromise!: (value: OpenClawGatewayStreamResult) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const done = new Promise<OpenClawGatewayStreamResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const resolveOnce = (value: OpenClawGatewayStreamResult): void => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    resolvePromise(value);
  };

  const rejectOnce = (error: Error): void => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    rejectPromise(error);
  };

  const sendFrame = (frame: Record<string, unknown>): void => {
    socket.send(JSON.stringify(frame));
  };

  const handleConnectChallenge = (frame: Record<string, unknown>): void => {
    const nonce = asString(asObject(frame.payload)?.nonce)?.trim();
    if (!nonce) {
      rejectOnce(new GatewayStreamStartError("Gateway connect challenge missing nonce."));
      return;
    }
    if (connectSent) {
      return;
    }
    connectSent = true;
    const connectParams = buildGatewayConnectParams(connection, nonce);
    sendFrame({
      type: "req",
      id: connectRequestId,
      method: "connect",
      params: connectParams,
    });
  };

  const handleConnectResponse = (frame: Record<string, unknown>): void => {
    if (frame.id !== connectRequestId) {
      return;
    }
    if (frame.ok !== true) {
      rejectOnce(new GatewayStreamStartError(resolveGatewayFrameErrorMessage(frame, "Gateway connect failed.")));
      return;
    }
    persistGatewayConnectAuthToken(connection, asObject(asObject(frame.payload)?.auth)).catch(() => void 0);
    if (chatSendSent) {
      return;
    }
    chatSendSent = true;
    sendFrame({
      type: "req",
      id: chatRequestId,
      method: "chat.send",
      params: {
        sessionKey: request.sessionKey,
        message: request.message,
        timeoutMs: Math.max(1_000, request.timeoutSeconds * 1_000),
        idempotencyKey: clientRunId,
      },
    });
  };

  const handleChatSendResponse = (frame: Record<string, unknown>): void => {
    if (frame.id !== chatRequestId) {
      return;
    }
    if (frame.ok !== true) {
      rejectOnce(new GatewayStreamStartError(resolveGatewayFrameErrorMessage(frame, "Gateway chat.send failed.")));
      return;
    }
    const payload = asObject(frame.payload);
    runId = asString(payload?.runId) ?? clientRunId;
    runStarted = true;
    lastPayload = payload;
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = undefined;
    }
    setFinalTimer();
    void emitStreamEvent({
      state: "started",
      agentId: request.agentId,
      runId,
      sessionKey: request.sessionKey,
      rawPayload: payload,
    });
  };

  const handleChatEvent = (frame: Record<string, unknown>): void => {
    if (asString(frame.event) !== "chat") {
      return;
    }
    const payload = asObject(frame.payload);
    if (!payload) {
      return;
    }
    const payloadRunId = asString(payload.runId);
    if (runId && payloadRunId && payloadRunId !== runId) {
      return;
    }
    if (runId === undefined && payloadRunId) {
      runId = payloadRunId;
    }
    const payloadSessionKey = asString(payload.sessionKey) ?? request.sessionKey;
    if (payloadSessionKey !== request.sessionKey) {
      return;
    }

    const state = normalizeGatewayChatState(payload.state);
    if (!state) {
      return;
    }
    const nextText = extractGatewayChatVisibleText(payload);
    const nextDeltaText = extractGatewayChatDeltaText(payload);
    const mergedText = resolveMergedGatewayChatText({
      previousText: lastText,
      nextText,
      nextDeltaText,
    });
    const deltaText = diffGatewayChatText(lastText, mergedText) || nextDeltaText;
    if (hasNonWhitespaceText(mergedText)) {
      lastText = mergedText;
    }
    lastPayload = payload;
    const seq = asNumber(payload.seq);

    if (state === "delta") {
      void emitStreamEvent({
        state,
        agentId: request.agentId,
        runId,
        seq,
        sessionKey: payloadSessionKey,
        text: lastText || undefined,
        deltaText: deltaText || undefined,
        rawPayload: payload,
      });
      return;
    }

    if (state === "final") {
      void emitStreamEvent({
        state,
        agentId: request.agentId,
        runId,
        seq,
        sessionKey: payloadSessionKey,
        text: lastText || undefined,
        deltaText: deltaText || undefined,
        stopReason: asString(payload.stopReason),
        rawPayload: payload,
      });
      resolveOnce({
        started: true,
        runId,
        replyText: lastText,
        stopReason: asString(payload.stopReason),
        rawPayload: payload,
      });
      return;
    }

    const errorMessage =
      asString(payload.errorMessage) ||
      asString(asObject(payload.error)?.message) ||
      "Gateway chat stream returned an error.";
    void emitStreamEvent({
      state,
      agentId: request.agentId,
      runId,
      seq,
      sessionKey: payloadSessionKey,
      text: lastText || undefined,
      deltaText: deltaText || undefined,
      errorMessage,
      rawPayload: payload,
    });
    resolveOnce({
      started: true,
      runId,
      replyText: lastText,
      errorMessage,
      rawPayload: payload,
    });
  };

  const handleFrame = (frame: Record<string, unknown>): void => {
    const type = asString(frame.type);
    if (type === "event") {
      if (asString(frame.event) === "connect.challenge") {
        handleConnectChallenge(frame);
        return;
      }
      handleChatEvent(frame);
      return;
    }
    if (type !== "res") {
      return;
    }
    handleConnectResponse(frame);
    handleChatSendResponse(frame);
  };

  const handleClose = (event?: { code?: number; reason?: string }): void => {
    if (settled) {
      return;
    }
    const closeReason = formatGatewayCloseReason(event);
    if (!runStarted) {
      rejectOnce(new GatewayStreamStartError(closeReason));
      return;
    }
    void emitStreamEvent({
      state: "error",
      agentId: request.agentId,
      runId,
      sessionKey: request.sessionKey,
      text: lastText || undefined,
      errorMessage: closeReason,
    });
    resolveOnce({
      started: true,
      runId,
      replyText: lastText,
      errorMessage: closeReason,
      rawPayload: lastPayload,
    });
  };

  bindWebSocketEvent(socket, "message", (event) => {
    const text = normalizeWebSocketEventData(event);
    if (!text) {
      return;
    }
    const parsed = parseJsonRecord(text);
    if (!parsed) {
      return;
    }
    handleFrame(parsed);
  });
  bindWebSocketEvent(socket, "close", (event) => {
    handleClose(event as { code?: number; reason?: string });
  });
  bindWebSocketEvent(socket, "error", () => {
    handleClose();
  });

  if (request.signal) {
    if (request.signal.aborted) {
      handleExternalAbort();
    } else {
      request.signal.addEventListener("abort", handleExternalAbort, { once: true });
    }
  }

  connectTimer = setTimeout(() => {
    const message = "Timed out while opening the upstream gateway stream.";
    if (!runStarted) {
      rejectOnce(new GatewayStreamStartError(message));
      return;
    }
    handleClose({ reason: message });
  }, GATEWAY_CONNECT_TIMEOUT_MS);
  connectTimer.unref?.();

  try {
    return await done;
  } finally {
    if (request.signal) {
      request.signal.removeEventListener("abort", handleExternalAbort);
    }
  }
}

export async function abortOpenClawGatewayChatRun(
  request: OpenClawGatewayAbortRequest,
): Promise<OpenClawGatewayAbortResult> {
  const sessionKey = asString(request.sessionKey)?.trim();
  if (!sessionKey) {
    throw new GatewayStreamStartError("Gateway chat.abort requires a sessionKey.");
  }

  const connection = await resolveGatewayConnectionConfig();
  const WebSocketCtor = resolveWebSocketCtor();
  const socket = new WebSocketCtor(connection.url);
  const connectRequestId = randomUUID();
  const abortRequestId = randomUUID();
  const timeoutMs = Math.max(1_000, asNumber(request.timeoutMs) ?? GATEWAY_CONNECT_TIMEOUT_MS);

  let settled = false;
  let connectSent = false;
  let abortSent = false;
  let timer: NodeJS.Timeout | undefined;

  const cleanup = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    try {
      socket.close();
    } catch {
      // Ignore close races.
    }
  };

  let resolvePromise!: (value: OpenClawGatewayAbortResult) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const done = new Promise<OpenClawGatewayAbortResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const resolveOnce = (value: OpenClawGatewayAbortResult): void => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    resolvePromise(value);
  };

  const rejectOnce = (error: Error): void => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    rejectPromise(error);
  };

  const sendFrame = (frame: Record<string, unknown>): void => {
    socket.send(JSON.stringify(frame));
  };

  const handleConnectChallenge = (frame: Record<string, unknown>): void => {
    const nonce = asString(asObject(frame.payload)?.nonce)?.trim();
    if (!nonce) {
      rejectOnce(new GatewayStreamStartError("Gateway connect challenge missing nonce."));
      return;
    }
    if (connectSent) {
      return;
    }
    connectSent = true;
    const connectParams = buildGatewayConnectParams(connection, nonce);
    sendFrame({
      type: "req",
      id: connectRequestId,
      method: "connect",
      params: connectParams,
    });
  };

  const handleConnectResponse = (frame: Record<string, unknown>): void => {
    if (frame.id !== connectRequestId) {
      return;
    }
    if (frame.ok !== true) {
      rejectOnce(new GatewayStreamStartError(resolveGatewayFrameErrorMessage(frame, "Gateway connect failed.")));
      return;
    }
    persistGatewayConnectAuthToken(connection, asObject(asObject(frame.payload)?.auth)).catch(() => void 0);
    if (abortSent) {
      return;
    }
    abortSent = true;
    sendFrame({
      type: "req",
      id: abortRequestId,
      method: "chat.abort",
      params: {
        sessionKey,
        ...(request.runId ? { runId: request.runId } : {}),
      },
    });
  };

  const handleAbortResponse = (frame: Record<string, unknown>): void => {
    if (frame.id !== abortRequestId) {
      return;
    }
    if (frame.ok !== true) {
      rejectOnce(new GatewayStreamStartError(resolveGatewayFrameErrorMessage(frame, "Gateway chat.abort failed.")));
      return;
    }
    const payload = asObject(frame.payload);
    const runIds = asStringArray(payload?.runIds);
    resolveOnce({
      ok: true,
      aborted: asBoolean(payload?.aborted) === true || runIds.length > 0,
      runIds,
      rawPayload: payload,
    });
  };

  const handleClose = (event?: { code?: number; reason?: string }): void => {
    if (settled) {
      return;
    }
    rejectOnce(new GatewayStreamStartError(formatGatewayCloseReason(event)));
  };

  bindWebSocketEvent(socket, "message", (event) => {
    const raw = normalizeWebSocketEventData(event);
    if (!raw) {
      return;
    }
    const parsed = parseJsonRecord(raw);
    if (!parsed) {
      return;
    }
    if (asString(parsed.event) === "connect.challenge") {
      handleConnectChallenge(parsed);
      return;
    }
    handleConnectResponse(parsed);
    handleAbortResponse(parsed);
  });
  bindWebSocketEvent(socket, "close", (event) => {
    handleClose(event as { code?: number; reason?: string });
  });
  bindWebSocketEvent(socket, "error", () => {
    handleClose();
  });

  timer = setTimeout(() => {
    rejectOnce(new GatewayStreamStartError("Timed out while sending the upstream gateway chat.abort request."));
  }, timeoutMs);
  timer.unref?.();

  return await done;
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

async function resolveGatewayConnectionConfig(): Promise<GatewayConnectionConfig> {
  const openClawHomeDir = resolveGatewayOpenClawHomeDir();
  const config = await readGatewayConfigSnapshot();
  const gateway = asObject(config?.gateway);
  const remote = asObject(gateway?.remote);
  const gatewayAuth = asObject(gateway?.auth);
  const isRemoteMode = asString(gateway?.mode)?.toLowerCase() === "remote";
  const envUrl =
    readEnvString(["GATEWAY_URL", "OPENCLAW_GATEWAY_URL", "CLAWDBOT_GATEWAY_URL"]) ||
    undefined;
  const configUrl = isRemoteMode
    ? asString(remote?.url)
    : asString(remote?.url) || undefined;
  const tlsEnabled = asBoolean(asObject(gateway?.tls)?.enabled) === true;
  const configuredPort = asNumber(gateway?.port);
  const localUrl = `${tlsEnabled ? "wss" : "ws"}://127.0.0.1:${
    Number.isFinite(configuredPort) && configuredPort! > 0 ? Math.trunc(configuredPort!) : DEFAULT_GATEWAY_PORT
  }`;
  const url = normalizeGatewayWebSocketUrl(envUrl || configUrl || localUrl);

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
  const deviceIdentity = await loadOrCreateGatewayDeviceIdentity(openClawHomeDir).catch(() => undefined);
  const storedDeviceToken = await loadGatewayStoredDeviceAuthToken({
    openClawHomeDir,
    deviceId: deviceIdentity?.deviceId,
  }).catch(() => undefined);

  return {
    openClawHomeDir,
    url,
    token: envToken || configToken,
    password: envPassword || configPassword,
    deviceToken: storedDeviceToken?.token,
    deviceIdentity,
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

function resolveWebSocketCtor(): GatewayWebSocketCtor {
  const candidate = (globalThis as { WebSocket?: GatewayWebSocketCtor }).WebSocket;
  if (typeof candidate !== "function") {
    throw new GatewayStreamStartError("WebSocket is unavailable in this runtime.");
  }
  return candidate;
}

function bindWebSocketEvent(
  socket: GatewayWebSocketLike,
  event: "message" | "close" | "error",
  handler: (event: unknown) => void,
): void {
  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(event, handler);
    return;
  }
  if (event === "message") {
    socket.onmessage = handler as (event: { data?: unknown }) => void;
    return;
  }
  if (event === "close") {
    socket.onclose = handler as (event: { code?: number; reason?: string }) => void;
    return;
  }
  socket.onerror = handler;
}

function normalizeWebSocketEventData(event: unknown): string {
  const data =
    asObject(event)?.data ??
    (typeof event === "string" ? event : undefined) ??
    (event instanceof Buffer ? event.toString("utf8") : undefined);
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof Buffer) {
    return data.toString("utf8");
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data).toString("utf8");
  }
  return "";
}

function parseJsonRecord(input: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(input) as unknown;
    return asObject(parsed);
  } catch {
    return undefined;
  }
}

function resolveGatewayFrameErrorMessage(
  frame: Record<string, unknown>,
  fallback: string,
): string {
  const error = asObject(frame.error);
  return (
    asString(error?.message) ||
    asString(error?.code) ||
    asString(frame.error) ||
    fallback
  );
}

function formatGatewayCloseReason(event?: { code?: number; reason?: string }): string {
  const code = asNumber(event?.code);
  const reason = asString(event?.reason);
  if (code && reason) {
    return `Gateway chat stream closed (${code}: ${reason}).`;
  }
  if (code) {
    return `Gateway chat stream closed (${code}).`;
  }
  if (reason) {
    return `Gateway chat stream closed: ${reason}.`;
  }
  return "Gateway chat stream closed before a final event arrived.";
}

function normalizeGatewayChatState(input: unknown): "delta" | "final" | "error" | undefined {
  const value = asString(input)?.trim().toLowerCase();
  if (!value) {
    return undefined;
  }
  if (value === "delta" || value === "partial" || value === "streaming" || value === "stream") {
    return "delta";
  }
  if (
    value === "final" ||
    value === "done" ||
    value === "complete" ||
    value === "completed" ||
    value === "finished"
  ) {
    return "final";
  }
  if (value === "error" || value === "failed" || value === "failure") {
    return "error";
  }
  return undefined;
}

function extractGatewayChatVisibleText(payload: Record<string, unknown>): string {
  for (const candidate of [
    payload.message,
    asObject(payload.message)?.content,
    payload.data,
    asObject(payload.data)?.content,
    payload.content,
    payload.text,
    payload.outputText,
    payload.visibleText,
  ]) {
    const resolved = extractGatewayStructuredText(candidate);
    if (hasNonWhitespaceText(resolved)) {
      return resolved;
    }
  }
  return "";
}

function extractGatewayChatDeltaText(payload: Record<string, unknown>): string {
  for (const candidate of [payload, asObject(payload.message), asObject(payload.data)]) {
    const resolved = extractGatewayStructuredDeltaText(candidate);
    if (hasNonWhitespaceText(resolved)) {
      return resolved;
    }
  }
  return "";
}

function extractGatewayStructuredText(input: unknown, depth = 0): string {
  if (depth > 4) {
    return "";
  }
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    const parts = input
      .map((item) => extractGatewayStructuredText(item, depth + 1))
      .filter((value) => hasNonWhitespaceText(value));
    return parts.join("\n");
  }
  const entry = asObject(input);
  if (!entry) {
    return "";
  }
  for (const key of ["text", "content", "value", "outputText", "visibleText", "body"]) {
    const value = entry[key];
    if (typeof value === "string" && hasNonWhitespaceText(value)) {
      return value;
    }
  }
  for (const key of ["content", "message", "items", "parts", "blocks", "output"]) {
    const resolved = extractGatewayStructuredText(entry[key], depth + 1);
    if (hasNonWhitespaceText(resolved)) {
      return resolved;
    }
  }
  return "";
}

function extractGatewayStructuredDeltaText(input: unknown, depth = 0): string {
  if (depth > 4) {
    return "";
  }
  const entry = asObject(input);
  if (!entry) {
    return "";
  }
  for (const key of ["deltaText", "delta", "textDelta"]) {
    const value = entry[key];
    if (typeof value === "string" && hasNonWhitespaceText(value)) {
      return value;
    }
  }
  for (const key of ["message", "data", "payload"]) {
    const resolved = extractGatewayStructuredDeltaText(entry[key], depth + 1);
    if (hasNonWhitespaceText(resolved)) {
      return resolved;
    }
  }
  return "";
}

function appendUniqueGatewaySuffix(base: string, suffix: string): string {
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

function resolveMergedGatewayChatText(input: {
  previousText: string;
  nextText: string;
  nextDeltaText: string;
}): string {
  const { previousText, nextText, nextDeltaText } = input;
  if (hasNonWhitespaceText(nextText) && hasNonWhitespaceText(previousText)) {
    if (nextText.startsWith(previousText)) {
      return nextText;
    }
    if (previousText.startsWith(nextText) && !hasNonWhitespaceText(nextDeltaText)) {
      return previousText;
    }
  }
  if (hasNonWhitespaceText(nextDeltaText)) {
    return appendUniqueGatewaySuffix(previousText, nextDeltaText);
  }
  if (hasNonWhitespaceText(nextText)) {
    return nextText;
  }
  return previousText;
}

function diffGatewayChatText(previousText: string, nextText: string): string {
  if (!nextText) {
    return "";
  }
  if (!previousText) {
    return nextText;
  }
  if (nextText.startsWith(previousText)) {
    return nextText.slice(previousText.length);
  }
  return nextText;
}

function hasNonWhitespaceText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeGatewayWebSocketUrl(input: string): string {
  const trimmed = input.trim() || DEFAULT_GATEWAY_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:") {
      parsed.protocol = "ws:";
    } else if (parsed.protocol === "https:") {
      parsed.protocol = "wss:";
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function resolveGatewayOpenClawHomeDir(): string {
  const explicitHome = normalizeConfiguredPath(process.env.OPENCLAW_HOME);
  if (explicitHome) {
    return explicitHome;
  }
  const configuredPath = normalizeConfiguredPath(resolveOpenClawConfigPath());
  if (configuredPath && isAbsolute(configuredPath)) {
    return dirname(configuredPath);
  }
  return join(homedir(), ".openclaw");
}

function normalizeConfiguredPath(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const lowered = trimmed.toLowerCase();
  if (lowered === "undefined" || lowered === "null") {
    return undefined;
  }
  return trimmed;
}

function buildGatewayConnectParams(
  connection: GatewayConnectionConfig,
  nonce: string,
): Record<string, unknown> {
  const authToken = connection.token || connection.deviceToken;
  return {
    minProtocol: GATEWAY_PROTOCOL_VERSION,
    maxProtocol: GATEWAY_PROTOCOL_VERSION,
    client: {
      id: CONTROL_CENTER_CLIENT_ID,
      displayName: CONTROL_CENTER_CLIENT_DISPLAY_NAME,
      version: CONTROL_CENTER_CLIENT_VERSION,
      platform: process.platform,
      mode: CONTROL_CENTER_CLIENT_MODE,
    },
    role: CONTROL_CENTER_OPERATOR_ROLE,
    scopes: [...CONTROL_CENTER_OPERATOR_SCOPES],
    auth: {
      ...(authToken ? { token: authToken } : {}),
      ...(connection.password ? { password: connection.password } : {}),
    },
    ...(connection.deviceIdentity
      ? {
          device: buildGatewaySignedDevice({
            deviceIdentity: connection.deviceIdentity,
            nonce,
            token: authToken,
          }),
        }
      : {}),
  };
}

function buildGatewaySignedDevice(input: {
  deviceIdentity: GatewayDeviceIdentity;
  nonce: string;
  token?: string;
}): Record<string, unknown> {
  const signedAtMs = Date.now();
  const payload = buildGatewayDeviceAuthPayloadV3({
    deviceId: input.deviceIdentity.deviceId,
    clientId: CONTROL_CENTER_CLIENT_ID,
    clientMode: CONTROL_CENTER_CLIENT_MODE,
    role: CONTROL_CENTER_OPERATOR_ROLE,
    scopes: [...CONTROL_CENTER_OPERATOR_SCOPES],
    signedAtMs,
    token: input.token,
    nonce: input.nonce,
    platform: process.platform,
    deviceFamily: "",
  });
  return {
    id: input.deviceIdentity.deviceId,
    publicKey: publicKeyRawBase64UrlFromPem(input.deviceIdentity.publicKeyPem),
    signature: base64UrlEncode(
      sign(null, Buffer.from(payload, "utf8"), createPrivateKey(input.deviceIdentity.privateKeyPem)),
    ),
    signedAt: signedAtMs,
    nonce: input.nonce,
  };
}

function buildGatewayDeviceAuthPayloadV3(input: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: readonly string[];
  signedAtMs: number;
  token?: string;
  nonce: string;
  platform?: string;
  deviceFamily?: string;
}): string {
  return [
    "v3",
    input.deviceId,
    input.clientId,
    input.clientMode,
    input.role,
    input.scopes.join(","),
    String(input.signedAtMs),
    input.token ?? "",
    input.nonce,
    normalizeGatewayDeviceMetadata(input.platform),
    normalizeGatewayDeviceMetadata(input.deviceFamily),
  ].join("|");
}

function normalizeGatewayDeviceMetadata(input: unknown): string {
  return typeof input === "string" ? input.replace(/[|\r\n]+/g, " ").trim() : "";
}

function base64UrlEncode(input: Buffer): string {
  return input.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return base64UrlEncode(spki.subarray(ED25519_SPKI_PREFIX.length));
  }
  return base64UrlEncode(spki);
}

function deriveGatewayDeviceId(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" }) as Buffer;
  const raw =
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
      ? spki.subarray(ED25519_SPKI_PREFIX.length)
      : spki;
  return createHash("sha256").update(raw).digest("hex");
}

async function loadOrCreateGatewayDeviceIdentity(
  openClawHomeDir: string,
): Promise<GatewayDeviceIdentity | undefined> {
  const identityPath = join(openClawHomeDir, "identity", "device.json");
  const parsed = parseJsonRecord(await safeReadTextFile(identityPath));
  const existing = asGatewayDeviceIdentity(parsed);
  if (existing) {
    const derivedId = deriveGatewayDeviceId(existing.publicKeyPem);
    if (derivedId === existing.deviceId) {
      return existing;
    }
    const repairedIdentity = {
      ...existing,
      deviceId: derivedId,
    };
    await mkdir(dirname(identityPath), { recursive: true });
    await writeFile(
      identityPath,
      `${JSON.stringify(
        {
          version: 1,
          ...repairedIdentity,
          createdAtMs: Date.now(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return repairedIdentity;
  }

  const generated = generateKeyPairSync("ed25519");
  const publicKeyPem = generated.publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = generated.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const deviceId = deriveGatewayDeviceId(publicKeyPem);
  await mkdir(dirname(identityPath), { recursive: true });
  await writeFile(
    identityPath,
    `${JSON.stringify(
      {
        version: 1,
        deviceId,
        publicKeyPem,
        privateKeyPem,
        createdAtMs: Date.now(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return {
    deviceId,
    publicKeyPem,
    privateKeyPem,
  };
}

async function loadGatewayStoredDeviceAuthToken(input: {
  openClawHomeDir: string;
  deviceId?: string;
}): Promise<GatewayStoredDeviceAuthToken | undefined> {
  if (!input.deviceId) {
    return undefined;
  }
  const store = parseJsonRecord(
    await safeReadTextFile(join(input.openClawHomeDir, "identity", "device-auth.json")),
  );
  const tokens = asObject(store?.tokens);
  const operator = asObject(tokens?.operator);
  const token = asString(operator?.token)?.trim();
  if (
    asNumber(store?.version) !== 1 ||
    asString(store?.deviceId)?.trim() !== input.deviceId ||
    !token
  ) {
    return undefined;
  }
  return {
    token,
    scopes: asStringArray(operator?.scopes),
  };
}

async function persistGatewayConnectAuthToken(
  connection: GatewayConnectionConfig,
  auth: Record<string, unknown> | undefined,
): Promise<void> {
  const deviceIdentity = connection.deviceIdentity;
  const deviceToken = asString(auth?.deviceToken)?.trim();
  if (!deviceIdentity || !deviceToken) {
    return;
  }
  const scopes = asStringArray(auth?.scopes);
  const storePath = join(connection.openClawHomeDir, "identity", "device-auth.json");
  const nextStore = {
    version: 1,
    deviceId: deviceIdentity.deviceId,
    tokens: {
      operator: {
        token: deviceToken,
        role: CONTROL_CENTER_OPERATOR_ROLE,
        scopes,
        updatedAtMs: Date.now(),
      },
    },
  };
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(nextStore, null, 2)}\n`, "utf8");
}

async function safeReadTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function asGatewayDeviceIdentity(
  input: Record<string, unknown> | undefined,
): GatewayDeviceIdentity | undefined {
  const deviceId = asString(input?.deviceId)?.trim();
  const publicKeyPem = asString(input?.publicKeyPem);
  const privateKeyPem = asString(input?.privateKeyPem);
  if (!deviceId || !publicKeyPem || !privateKeyPem) {
    return undefined;
  }
  return {
    deviceId,
    publicKeyPem,
    privateKeyPem,
  };
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

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter((value): value is string => typeof value === "string" && value.trim() !== "");
}
