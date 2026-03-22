import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeLocalSafetyToken,
  renderLocalSafetyEnvText,
  type LocalSafetySettingsValues,
} from "../src/runtime/local-safety-settings";

test("renderLocalSafetyEnvText upserts safety keys without dropping unrelated env lines", () => {
  const source = [
    "GATEWAY_URL=ws://127.0.0.1:18789",
    "READONLY_MODE=true",
    "OTHER_FLAG=keep",
    "",
  ].join("\n");

  const values: LocalSafetySettingsValues = {
    readonlyMode: false,
    localTokenAuthRequired: true,
    importMutationEnabled: true,
    importMutationDryRun: true,
    approvalActionsEnabled: false,
    localApiToken: "abc 123",
  };

  const rendered = renderLocalSafetyEnvText(source, values);
  assert(rendered.includes("GATEWAY_URL=ws://127.0.0.1:18789"));
  assert(rendered.includes("OTHER_FLAG=keep"));
  assert(rendered.includes("READONLY_MODE=false"));
  assert(rendered.includes("LOCAL_TOKEN_AUTH_REQUIRED=true"));
  assert(rendered.includes("IMPORT_MUTATION_ENABLED=true"));
  assert(rendered.includes("IMPORT_MUTATION_DRY_RUN=true"));
  assert(rendered.includes("APPROVAL_ACTIONS_ENABLED=false"));
  assert(rendered.includes('LOCAL_API_TOKEN="abc 123"'));
});

test("normalizeLocalSafetyToken trims visible input and allows clearing", () => {
  assert.equal(normalizeLocalSafetyToken("  secret-token  "), "secret-token");
  assert.equal(normalizeLocalSafetyToken(""), "");
  assert.equal(normalizeLocalSafetyToken(undefined), "");
});
