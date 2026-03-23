import assert from "node:assert/strict";
import test from "node:test";
import { renderChatMarkdownToHtml } from "../src/runtime/chat-markdown";

test("chat markdown renders emphasis, lists, code, and safe links", () => {
  const html = renderChatMarkdownToHtml([
    "**最高温** 大致在 `17°C` 左右",
    "",
    "- 第一项",
    "- 第二项",
    "",
    "[OpenClaw](https://example.com)",
    "",
    "```ts",
    "console.log('ok')",
    "```",
  ].join("\n"));

  assert.match(html, /<strong>最高温<\/strong>/);
  assert.match(html, /<code>17°C<\/code>/);
  assert.match(html, /<ul class="chat-md-list">/);
  assert.match(html, /<a href="https:\/\/example\.com"/);
  assert.match(html, /<pre class="chat-md-code"><code data-language="ts">/);
});

test("chat markdown escapes unsafe html instead of rendering it", () => {
  const html = renderChatMarkdownToHtml("hello <script>alert(1)</script>");
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("chat markdown restores multiple inline code spans on the same line without leaking internal tokens", () => {
  const html = renderChatMarkdownToHtml(
    "- `Monday`: cloudy, `18-25C`, rain chance `20%`\n- `Tuesday`: light rain, `17-22C`, rain chance `70%`",
  );

  assert.doesNotMatch(html, /CHAT_CODE_|CHATCODETOKEN\d+PLACEHOLDER/);
  assert.match(html, /<code>Monday<\/code>/);
  assert.match(html, /<code>18-25C<\/code>/);
  assert.match(html, /<code>20%<\/code>/);
  assert.match(html, /<code>Tuesday<\/code>/);
  assert.match(html, /<code>17-22C<\/code>/);
  assert.match(html, /<code>70%<\/code>/);
});
