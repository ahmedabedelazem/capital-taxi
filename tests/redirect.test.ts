import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalRedirectPath } from "../lib/domain/redirect";

const origin = "https://capital-taxi.example";

test("accepts a same-origin portal path", () => {
  assert.equal(safeInternalRedirectPath("/customer?tab=trips", origin), "/customer?tab=trips");
});

test("rejects protocol-relative and absolute external URLs", () => {
  assert.equal(safeInternalRedirectPath("//evil.example/path", origin), null);
  assert.equal(safeInternalRedirectPath("https://evil.example/path", origin), null);
});

test("rejects backslash-based authority confusion", () => {
  assert.equal(safeInternalRedirectPath("/\\\\evil.example/path", origin), null);
});

test("rejects relative paths and malformed origins", () => {
  assert.equal(safeInternalRedirectPath("customer", origin), null);
  assert.equal(safeInternalRedirectPath("/customer", "not a url"), null);
});
