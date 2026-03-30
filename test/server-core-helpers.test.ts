import assert from "node:assert/strict";
import { validateHeaderValue } from "node:http";
import test from "node:test";
import { createServerRequestHelpers } from "../src/ui/server-core-helpers";

test("content disposition headers stay valid for unicode filenames", () => {
  class RequestValidationError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  const helpers = createServerRequestHelpers({
    RequestValidationError,
    searchLimitMax: 100,
    jsonMaxBytes: 1024 * 1024,
    formMaxBytes: 1024 * 1024,
    localTokenAuthRequired: false,
    localApiToken: "",
    localTokenHeader: "x-local-token",
  });

  const value = helpers.buildContentDispositionHeader(
    "inline",
    "AI员工系统_老板汇报版_最终版.pdf",
  );

  validateHeaderValue("content-disposition", value);
  assert.match(value, /^inline; filename="/);
  assert.match(value, /filename\*=UTF-8''/);
  assert.match(value, /\.pdf/i);
});
