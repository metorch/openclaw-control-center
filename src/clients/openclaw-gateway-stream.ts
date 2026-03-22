import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { AgentTurnStreamEvent } from "../contracts/openclaw-tools";
import { resolveOpenClawConfigPath } from "../runtime/current-agent-catalog";

const DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18789";
const DEFAULT_GATEWAY_PORT = 18_789;
const GATEWAY_PROTOCOL_VERSION = 1;
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

interface OpenClawGatewayStreamRequest {
  agentId: string;
  message: string;
  sessionKey: string;
  timeoutSeconds: number;
  onStreamEvent?: (event: AgentTurnStreamEvent) => void | Promise<void>;
}

export interface OpenClawGatewayStreamResult {
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

  const handleConnectChallenge = (): void => {
    if (connectSent) {
      return;
    }
    connectSent = true;
    sendFrame({
      type: "req",
      id: connectRequestId,
      method: "connect",
      params: {
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
          ...(connection.token ? { token: connection.token } : {}),
          ...(connection.password ? { password: connection.password } : {}),
        },
      },
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
    const deltaText = diffGatewayChatText(lastText, nextText);
    if (nextText) {
      lastText = nextText;
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
        handleConnectChallenge();
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

  connectTimer = setTimeout(() => {
    const message = "Timed out while opening the upstream gateway stream.";
    if (!runStarted) {
      rejectOnce(new GatewayStreamStartError(message));
      return;
    }
    handleClose({ reason: message });
  }, GATEWAY_CONNECT_TIMEOUT_MS);
  connectTimer.unref?.();

  return await done;
}

async function resolveGatewayConnectionConfig(): Promise<GatewayConnectionConfig> {
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
  if (value === "delta" || value === "final" || value === "error") {
    return value;
  }
  return undefined;
}

function extractGatewayChatVisibleText(payload: Record<string, unknown>): string {
  const message = asObject(payload.message);
  const direct =
    asString(message?.text) ??
    asString(message?.content) ??
    asString(payload.text) ??
    asString(payload.message);
  if (direct?.trim()) {
    return direct.trim();
  }
  const content = Array.isArray(message?.content) ? message?.content : [];
  const parts = content
    .map((item) => asObject(item))
    .map((item) => asString(item?.text) ?? asString(item?.content))
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map((value) => value.trim());
  return parts.join("\n").trim();
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
