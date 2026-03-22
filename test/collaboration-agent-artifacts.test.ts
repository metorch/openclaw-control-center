import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCollaborationAgentArtifactInstruction,
  extractCollaborationAgentArtifactPathsFromRawJson,
  parseCollaborationAgentArtifacts,
  COLLABORATION_AGENT_FILE_BLOCK_END,
  COLLABORATION_AGENT_FILE_BLOCK_START,
} from "../src/runtime/collaboration-agent-artifacts";

test("artifact parser strips hidden footer and collects declared paths", () => {
  const parsed = parseCollaborationAgentArtifacts([
    "已帮你生成文件。",
    COLLABORATION_AGENT_FILE_BLOCK_START,
    "reports/daily.html",
    "images/chart.png",
    COLLABORATION_AGENT_FILE_BLOCK_END,
  ].join("\n"));

  assert.equal(parsed.cleanReplyText, "已帮你生成文件。");
  assert.deepEqual(parsed.declaredPaths, ["reports/daily.html", "images/chart.png"]);
});

test("artifact parser can also infer file hints from visible reply text", () => {
  const parsed = parseCollaborationAgentArtifacts('Saved to: "./workspace/out/report.md"');
  assert.equal(parsed.cleanReplyText, "");
  assert.deepEqual(parsed.hintedPaths, ["./workspace/out/report.md"]);
});

test("artifact parser keeps the user-facing summary while stripping standalone file hint lines", () => {
  const parsed = parseCollaborationAgentArtifacts([
    "HTML ready for review.",
    "",
    'Saved to: "C:\\Users\\demo\\.openclaw\\workspace\\deliverables\\weather.html"',
  ].join("\n"));

  assert.equal(parsed.cleanReplyText, "HTML ready for review.");
  assert.deepEqual(parsed.hintedPaths, ["C:\\Users\\demo\\.openclaw\\workspace\\deliverables\\weather.html"]);
});

test("artifact instruction explains hidden footer contract", () => {
  const instruction = buildCollaborationAgentArtifactInstruction("C:/workspace/agents/jarvis");
  assert.match(instruction, /Current collaboration project root: C:\/workspace\/agents\/jarvis\./);
  assert.match(instruction, /Preferred save location for new deliverables: C:\/workspace\/agents\/jarvis\./);
  assert.match(instruction, /\[\[openclaw-files\]\]/);
  assert.match(instruction, /\[\[\/openclaw-files\]\]/);
});

test("artifact parser extracts file paths from raw tool call json", () => {
  const paths = extractCollaborationAgentArtifactPathsFromRawJson({
    payloads: [
      {
        content: [
          {
            type: "toolCall",
            name: "write",
            arguments: {
              path: "C:\\Users\\demo\\.openclaw\\workspace\\deliverables\\weather.html",
              content: "<!doctype html>",
            },
            partialJson:
              '{"path":"C:\\\\Users\\\\demo\\\\.openclaw\\\\workspace\\\\deliverables\\\\weather.html","content":"<!doctype html>"}',
          },
        ],
      },
    ],
  });

  assert.deepEqual(paths, ["C:\\Users\\demo\\.openclaw\\workspace\\deliverables\\weather.html"]);
});
