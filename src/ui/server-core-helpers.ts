// @ts-nocheck

const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { basename, dirname, join, resolve } = require("node:path");
const { evaluateLocalTokenGate, normalizeToken, readAuthorizationBearer } = require("../runtime/local-token-auth");

function asObjectLocal(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}

function asArrayLocal(value) {
  return Array.isArray(value) ? value : [];
}

function asStringLocal(value) {
  return typeof value === "string" ? value : void 0;
}

function normalizeLookupKeyLocal(input) {
  return String(input || "").trim().toLowerCase();
}

function safeReadTextFileSync(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return void 0;
  }
}

function inferWorkspaceRootFromConfigObject(input, configDir) {
  const root = asObjectLocal(input);
  const agents = asObjectLocal(root?.agents);
  const list = asArrayLocal(agents?.list);
  const mainRow = list
    .map((item) => asObjectLocal(item))
    .find((row) => normalizeLookupKeyLocal(asStringLocal(row?.id)?.trim() ?? asStringLocal(row?.name)?.trim() ?? "") === "main");
  const explicitMainWorkspace = asStringLocal(mainRow?.workspace)?.trim();
  if (explicitMainWorkspace) {
    return resolve(configDir, explicitMainWorkspace);
  }
  const inferredRoots = new Set();
  for (const item of list) {
    const row = asObjectLocal(item);
    const rawWorkspace = asStringLocal(row?.workspace)?.trim();
    if (!rawWorkspace) continue;
    const workspacePath = resolve(configDir, rawWorkspace);
    const parentDir = dirname(workspacePath);
    if (basename(parentDir).toLowerCase() !== "agents") continue;
    inferredRoots.add(dirname(parentDir));
  }
  if (inferredRoots.size === 1) {
    return [...inferredRoots][0];
  }
  return void 0;
}

function inferWorkspaceRootFromConfigText(raw, configDir) {
  if (!raw?.trim()) {
    return void 0;
  }
  try {
    return inferWorkspaceRootFromConfigObject(JSON.parse(raw), configDir);
  } catch {
    return void 0;
  }
}

function resolveOpenClawWorkspaceRoot(input) {
  const explicit = input.explicitWorkspaceRoot?.trim();
  if (explicit) {
    return resolve(explicit);
  }
  const configText = safeReadTextFileSync(input.configPath);
  const inferred = inferWorkspaceRootFromConfigText(configText, dirname(input.configPath));
  if (inferred) {
    return inferred;
  }
  return join(input.openclawHomeDir, "workspace");
}

function resolveOpenClawWorkspaceRootForSmoke(input) {
  const explicit = input.explicitWorkspaceRoot?.trim();
  if (explicit) {
    return resolve(explicit);
  }
  const configDir = dirname(input.configPath?.trim() || join(input.openclawHomeDir, "openclaw.json"));
  const inferred = inferWorkspaceRootFromConfigText(input.configText, configDir);
  if (inferred) {
    return inferred;
  }
  return join(input.openclawHomeDir, "workspace");
}

function createServerRequestHelpers(deps) {
  const {
    RequestValidationError,
    searchLimitMax,
    jsonMaxBytes,
    formMaxBytes,
    localTokenAuthRequired,
    localApiToken,
    localTokenHeader,
  } = deps;

  function readHeaderValue(req, name) {
    const value = req.headers[name];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return void 0;
  }

  function sanitizeRequestId(value) {
    const trimmed = value.trim();
    if (!trimmed) return void 0;
    if (trimmed.length > 80) return void 0;
    if (!/^[a-zA-Z0-9._:-]+$/.test(trimmed)) return void 0;
    return trimmed;
  }

  function responseRequestId(res) {
    const value = res.getHeader("x-request-id");
    return typeof value === "string" && value.trim() !== "" ? value : void 0;
  }

  function attachRequestIdToBody(body, requestId) {
    if (!requestId) return body;
    const obj = asObjectLocal(body);
    if (!obj) return body;
    if (typeof obj.requestId === "string" && obj.requestId.trim() !== "") return body;
    return { requestId, ...obj };
  }

  async function readRawBody(req, maxBytes) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        throw new RequestValidationError("Request payload too large.", 413);
      }
      chunks.push(buffer);
    }
    if (chunks.length === 0) return "";
    return Buffer.concat(chunks).toString("utf8").trim();
  }

  async function readJsonBody(req) {
    const text = await readRawBody(req, jsonMaxBytes);
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new RequestValidationError("Invalid JSON body.", 400);
    }
  }

  async function readFormBody(req) {
    const text = await readRawBody(req, formMaxBytes);
    return new URLSearchParams(text);
  }

  async function readBinaryBody(req, maxBytes) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        throw new RequestValidationError("Request payload too large.", 413);
      }
      chunks.push(buffer);
    }
    return chunks.length === 0 ? Buffer.alloc(0) : Buffer.concat(chunks);
  }

  function normalizeOptionalPositiveInt(input, label) {
    if (input === null || input === void 0 || input === "") return void 0;
    if (!/^\d+$/.test(input.trim())) {
      throw new RequestValidationError(`${label} must be a non-negative integer.`, 400);
    }
    const value = Number.parseInt(input.trim(), 10);
    if (!Number.isFinite(value) || value < 0) {
      throw new RequestValidationError(`${label} must be a non-negative integer.`, 400);
    }
    if (label === "limit") {
      return Math.max(1, Math.min(searchLimitMax, value));
    }
    return value;
  }

  function decodeURIComponentSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function sanitizeHeaderFileName(fileName) {
    const normalized = basename(fileName.trim())
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/["\\;]/g, "_")
      .trim();
    return normalized || "download";
  }

  function writeText(res, statusCode, body, contentType) {
    const headers = { "content-type": contentType };
    const normalizedContentType = contentType.toLowerCase();
    if (normalizedContentType.includes("text/html")) {
      headers["cache-control"] = "no-store, no-cache, must-revalidate, max-age=0";
      headers.pragma = "no-cache";
      headers.expires = "0";
    }
    const requestId = responseRequestId(res);
    if (requestId) {
      headers["x-request-id"] = requestId;
    }
    res.writeHead(statusCode, headers);
    res.end(body);
  }

  function writeJson(res, statusCode, body) {
    writeText(
      res,
      statusCode,
      JSON.stringify(attachRequestIdToBody(body, responseRequestId(res)), null, 2),
      "application/json; charset=utf-8",
    );
  }

  function writeApiError(res, statusCode, code, message, issues) {
    const requestId = responseRequestId(res);
    writeJson(res, statusCode, {
      ok: false,
      requestId,
      error: { code, status: statusCode, message, issues, requestId },
    });
  }

  function writeBinary(res, statusCode, body, contentType) {
    const headers = {
      "content-type": contentType,
      "content-length": String(body.byteLength),
      "cache-control": "public, max-age=300",
    };
    const requestId = responseRequestId(res);
    if (requestId) {
      headers["x-request-id"] = requestId;
    }
    res.writeHead(statusCode, headers);
    res.end(body);
  }

  function redirect(res, statusCode, location) {
    const headers = { location };
    const requestId = responseRequestId(res);
    if (requestId) {
      headers["x-request-id"] = requestId;
    }
    res.writeHead(statusCode, headers);
    res.end();
  }

  function resolveRequestId(req) {
    const headerValue = req.headers["x-request-id"];
    if (typeof headerValue === "string") {
      const normalized = sanitizeRequestId(headerValue);
      if (normalized) return normalized;
    }
    if (Array.isArray(headerValue)) {
      for (const candidate of headerValue) {
        const normalized = sanitizeRequestId(candidate);
        if (normalized) return normalized;
      }
    }
    return randomUUID();
  }

  function assertMutationAuthorized(req, routeLabel, explicitToken) {
    const token =
      normalizeToken(explicitToken) ??
      normalizeToken(readHeaderValue(req, localTokenHeader)) ??
      normalizeToken(readAuthorizationBearer(readHeaderValue(req, "authorization")));
    const decision = evaluateLocalTokenGate({
      gateRequired: localTokenAuthRequired,
      configuredToken: localApiToken,
      providedToken: token,
      routeLabel,
    });
    if (!decision.ok) {
      throw new RequestValidationError(decision.message, decision.statusCode);
    }
  }

  function assertJsonContentType(req) {
    const contentType = req.headers["content-type"];
    if (typeof contentType !== "string" || !contentType.toLowerCase().includes("application/json")) {
      throw new RequestValidationError("JSON request body must use 'Content-Type: application/json'.", 415);
    }
  }

  function assertAllowedQueryParams(searchParams, allowed, strict) {
    if (!strict) return;
    const allowedSet = new Set(allowed);
    const unknown = [...new Set([...searchParams.keys()].filter((key) => !allowedSet.has(key)))];
    if (unknown.length === 0) return;
    throw new RequestValidationError(
      `Unknown query parameter(s): ${unknown.join(", ")}`,
      400,
      unknown.map((key) => `query '${key}' is not supported`),
    );
  }

  function expectObject(input, label) {
    const obj = asObjectLocal(input);
    if (!obj) {
      throw new RequestValidationError(`${label} must be a JSON object.`, 400);
    }
    return obj;
  }

  function decodeRouteParam(path, pattern, label) {
    const match = path.match(pattern);
    if (!match) {
      throw new RequestValidationError(`${label} route parameter is required.`, 400);
    }
    try {
      const decoded = decodeURIComponent(match[1]).trim();
      if (!decoded) throw new Error("empty");
      if (decoded.length > 240) {
        throw new RequestValidationError(`${label} route parameter must be <= 240 characters.`, 400);
      }
      if (/[\u0000-\u001F\u007F]/.test(decoded)) {
        throw new RequestValidationError(`${label} route parameter contains invalid control characters.`, 400);
      }
      return decoded;
    } catch (error) {
      if (error instanceof RequestValidationError) throw error;
      throw new RequestValidationError(`${label} route parameter is invalid.`, 400);
    }
  }

  function normalizeQueryString(value, label, maxLength, strict) {
    if (!value) return void 0;
    const trimmed = value.trim();
    if (!trimmed) return void 0;
    if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
      if (strict) throw new RequestValidationError(`${label} contains invalid control characters`, 400);
      return void 0;
    }
    if (trimmed.length > maxLength) {
      if (strict) throw new RequestValidationError(`${label} must be <= ${maxLength} characters`, 400);
      return void 0;
    }
    return trimmed;
  }

  function readPositiveIntQuery(value, label, fallback, strict, maxValue = 1e3) {
    if (!value) return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maxValue) {
      if (strict) throw new RequestValidationError(`${label} must be an integer in range 1..${maxValue}`, 400);
      return fallback;
    }
    return parsed;
  }

  function readRequiredFormValue(form, key) {
    const raw = form.get(key)?.trim();
    if (!raw) {
      throw new RequestValidationError(`${key} is required.`, 400);
    }
    if (raw.length > 260) {
      throw new RequestValidationError(`${key} must be <= 260 characters.`, 400);
    }
    return raw;
  }

  function requiredBoundedString(input, label, maxLength) {
    if (typeof input !== "string" || input.trim() === "") {
      throw new RequestValidationError(`${label} is required.`, 400);
    }
    const trimmed = input.trim();
    if (trimmed.length > maxLength) {
      throw new RequestValidationError(`${label} must be <= ${maxLength} characters`, 400);
    }
    return trimmed;
  }

  function optionalBoundedString(input, label, maxLength) {
    if (input === void 0) return void 0;
    if (typeof input !== "string") {
      throw new RequestValidationError(`${label} must be a string`, 400);
    }
    const trimmed = input.trim();
    if (!trimmed) return void 0;
    if (trimmed.length > maxLength) {
      throw new RequestValidationError(`${label} must be <= ${maxLength} characters`, 400);
    }
    return trimmed;
  }

  function boundedTextField(input, label, maxLength) {
    if (typeof input !== "string") {
      throw new RequestValidationError(`${label} must be a string`, 400);
    }
    if (input.length > maxLength) {
      throw new RequestValidationError(`${label} must be <= ${maxLength} characters`, 400);
    }
    return input;
  }

  function optionalIntegerField(input, label, min, max) {
    if (input === void 0 || input === null || input === "") return void 0;
    if (typeof input !== "number" || !Number.isInteger(input)) {
      throw new RequestValidationError(`${label} must be an integer.`, 400);
    }
    if (input < min || input > max) {
      throw new RequestValidationError(`${label} must be in range ${min}..${max}.`, 400);
    }
    return input;
  }

  function optionalPositiveNumberField(input, label, max) {
    if (input === void 0 || input === null || input === "") return void 0;
    if (typeof input !== "number" || !Number.isFinite(input)) {
      throw new RequestValidationError(`${label} must be a finite number.`, 400);
    }
    if (input <= 0 || input > max) {
      throw new RequestValidationError(`${label} must be > 0 and <= ${max}.`, 400);
    }
    return Number(input);
  }

  function optionalIsoTimestampField(input, label) {
    if (input === void 0 || input === null || input === "") return void 0;
    if (typeof input !== "string") {
      throw new RequestValidationError(`${label} must be an ISO date-time string.`, 400);
    }
    const trimmed = input.trim();
    if (!trimmed) return void 0;
    if (trimmed.length > 80) {
      throw new RequestValidationError(`${label} must be <= 80 characters.`, 400);
    }
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      throw new RequestValidationError(`${label} must be a valid ISO date-time string.`, 400);
    }
    return new Date(parsed).toISOString();
  }

  return {
    assertAllowedQueryParams,
    assertJsonContentType,
    assertMutationAuthorized,
    boundedTextField,
    decodeRouteParam,
    decodeURIComponentSafe,
    expectObject,
    normalizeOptionalPositiveInt,
    normalizeQueryString,
    optionalBoundedString,
    optionalIntegerField,
    optionalIsoTimestampField,
    optionalPositiveNumberField,
    readBinaryBody,
    readFormBody,
    readHeaderValue,
    readJsonBody,
    readPositiveIntQuery,
    readRequiredFormValue,
    redirect,
    requiredBoundedString,
    resolveRequestId,
    sanitizeHeaderFileName,
    writeApiError,
    writeBinary,
    writeJson,
    writeText,
  };
}

export {
  createServerRequestHelpers,
  resolveOpenClawWorkspaceRoot,
  resolveOpenClawWorkspaceRootForSmoke,
};
