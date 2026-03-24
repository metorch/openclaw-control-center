import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { abortOpenClawGatewayChatRun } from "../src/clients/openclaw-gateway-stream";

test("abortOpenClawGatewayChatRun sends chat.abort to the upstream gateway", async () => {
  const previousGatewayUrl = process.env.GATEWAY_URL;
  const previousWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  const sentFrames: Array<{ method?: string; params?: Record<string, unknown> }> = [];

  class FakeGatewayWebSocket {
    private listeners = new Map<string, Array<(event: unknown) => void>>();

    constructor(_url: string) {
      setTimeout(() => {
        this.emit("message", {
          data: JSON.stringify({
            type: "event",
            event: "connect.challenge",
            payload: { nonce: "nonce-abort-1" },
          }),
        });
      }, 0);
    }

    addEventListener(type: string, listener: (event: unknown) => void): void {
      const current = this.listeners.get(type) ?? [];
      current.push(listener);
      this.listeners.set(type, current);
    }

    send(data: string): void {
      const frame = JSON.parse(data) as {
        id?: string;
        method?: string;
        params?: Record<string, unknown>;
      };
      sentFrames.push({ method: frame.method, params: frame.params });
      if (frame.method === "connect") {
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: { protocol: 3 },
            }),
          });
        }, 0);
        return;
      }
      if (frame.method === "chat.abort") {
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: {
                ok: true,
                aborted: true,
                runIds: ["run-abort-1"],
              },
            }),
          });
        }, 0);
      }
    }

    close(): void {
      // No-op in the fake socket.
    }

    private emit(type: string, event: unknown): void {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event);
      }
    }
  }

  try {
    process.env.GATEWAY_URL = "ws://127.0.0.1:18789";
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: FakeGatewayWebSocket,
    });

    const result = await abortOpenClawGatewayChatRun({
      sessionKey: "agent:jarvis:thread:collab-room-abort",
      runId: "run-abort-1",
      timeoutMs: 2_000,
    });

    assert.equal(sentFrames[0]?.method, "connect");
    assert.equal(sentFrames[1]?.method, "chat.abort");
    assert.equal(sentFrames[1]?.params?.sessionKey, "agent:jarvis:thread:collab-room-abort");
    assert.equal(sentFrames[1]?.params?.runId, "run-abort-1");
    assert.deepEqual(result, {
      ok: true,
      aborted: true,
      runIds: ["run-abort-1"],
      rawPayload: {
        ok: true,
        aborted: true,
        runIds: ["run-abort-1"],
      },
    });
  } finally {
    if (typeof previousGatewayUrl === "string") {
      process.env.GATEWAY_URL = previousGatewayUrl;
    } else {
      delete process.env.GATEWAY_URL;
    }
    if (previousWebSocketDescriptor) {
      Object.defineProperty(globalThis, "WebSocket", previousWebSocketDescriptor);
    } else {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    }
  }
});

test("abortOpenClawGatewayChatRun signs the connect request with the local device identity", async () => {
  const previousConfigPath = process.env.OPENCLAW_CONFIG_PATH;
  const previousWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  const tempRoot = await mkdtemp(join(tmpdir(), "openclaw-gateway-device-auth-"));
  const sentFrames: Array<{ method?: string; params?: Record<string, unknown> }> = [];

  class FakeGatewayWebSocket {
    private listeners = new Map<string, Array<(event: unknown) => void>>();

    constructor(_url: string) {
      setTimeout(() => {
        this.emit("message", {
          data: JSON.stringify({
            type: "event",
            event: "connect.challenge",
            payload: { nonce: "nonce-device-auth-1" },
          }),
        });
      }, 0);
    }

    addEventListener(type: string, listener: (event: unknown) => void): void {
      const current = this.listeners.get(type) ?? [];
      current.push(listener);
      this.listeners.set(type, current);
    }

    send(data: string): void {
      const frame = JSON.parse(data) as {
        id?: string;
        method?: string;
        params?: Record<string, unknown>;
      };
      sentFrames.push({ method: frame.method, params: frame.params });
      if (frame.method === "connect") {
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: {
                protocol: 3,
                auth: {
                  deviceToken: "device-token-from-hello",
                  scopes: ["operator.read", "operator.write"],
                },
              },
            }),
          });
        }, 0);
        return;
      }
      if (frame.method === "chat.abort") {
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: { ok: true, aborted: false, runIds: [] },
            }),
          });
        }, 0);
      }
    }

    close(): void {
      // No-op in the fake socket.
    }

    private emit(type: string, event: unknown): void {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event);
      }
    }
  }

  try {
    const openClawHome = tempRoot;
    const identityDir = join(openClawHome, "identity");
    const configPath = join(openClawHome, "openclaw.json");
    const publicKeyPem = [
      "-----BEGIN PUBLIC KEY-----",
      "MCowBQYDK2VwAyEA1w6Llt5A3QYycIpQWWEg9vTi3Sa1T2k0TQfY7CMO7mI=",
      "-----END PUBLIC KEY-----",
      "",
    ].join("\n");
    const privateKeyPem = [
      "-----BEGIN PRIVATE KEY-----",
      "MC4CAQAwBQYDK2VwBCIEIGkn+ddP8EmICiPaw1WpkH8xBCBUJnU8H5rmB6LeWw3h",
      "-----END PRIVATE KEY-----",
      "",
    ].join("\n");

    await mkdir(identityDir, { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify(
        {
          gateway: {
            mode: "local",
            auth: {
              mode: "token",
              token: "gateway-token-1",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      join(identityDir, "device.json"),
      JSON.stringify(
        {
          version: 1,
          deviceId: "device-test-1",
          publicKeyPem,
          privateKeyPem,
          createdAtMs: Date.now(),
        },
        null,
        2,
      ),
      "utf8",
    );

    process.env.OPENCLAW_CONFIG_PATH = configPath;
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: FakeGatewayWebSocket,
    });

    await abortOpenClawGatewayChatRun({
      sessionKey: "agent:jarvis:thread:collab-room-device-auth",
      timeoutMs: 2_000,
    });

    const connectFrame = sentFrames.find((frame) => frame.method === "connect");
    assert.equal(connectFrame?.params?.auth?.token, "gateway-token-1");
    assert.equal(typeof connectFrame?.params?.device?.id, "string");
    assert.equal(typeof connectFrame?.params?.device?.publicKey, "string");
    assert.equal(typeof connectFrame?.params?.device?.signature, "string");
    assert.equal(connectFrame?.params?.device?.nonce, "nonce-device-auth-1");
  } finally {
    if (typeof previousConfigPath === "string") {
      process.env.OPENCLAW_CONFIG_PATH = previousConfigPath;
    } else {
      delete process.env.OPENCLAW_CONFIG_PATH;
    }
    if (previousWebSocketDescriptor) {
      Object.defineProperty(globalThis, "WebSocket", previousWebSocketDescriptor);
    } else {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
});
