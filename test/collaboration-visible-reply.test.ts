import test from "node:test";
import assert from "node:assert/strict";
import { extractVisibleAgentReplyText } from "../src/runtime/collaboration-room";

test("extractVisibleAgentReplyText strips hidden stage results and file footers", () => {
  const raw = [
    "[[reply_to_current]] 已经处理完成。",
    "",
    "[[openclaw-files]]",
    "runtime/result.md",
    "[[/openclaw-files]]",
    "",
    '<stage_result resultState="awaiting_review">{"summary":"hidden"}</stage_result>',
  ].join("\n");

  assert.equal(extractVisibleAgentReplyText(raw, "main"), "已经处理完成。");
});
