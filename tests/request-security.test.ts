import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginCookieRequest, isSameOriginRequest } from "../lib/domain/request-security";

const url = "https://capital-taxi.example/api/test";

test("accepts an exact same-origin request", () => {
  const request = new Request(url, { method: "POST", headers: { origin: "https://capital-taxi.example" } });
  assert.equal(isSameOriginRequest(request), true);
  assert.equal(isSameOriginCookieRequest(request), true);
});

test("rejects a cross-origin mutation", () => {
  const request = new Request(url, { method: "PATCH", headers: { origin: "https://attacker.example" } });
  assert.equal(isSameOriginCookieRequest(request), false);
});

test("rejects a mutation with no Origin header", () => {
  const request = new Request(url, { method: "DELETE" });
  assert.equal(isSameOriginCookieRequest(request), false);
});

test("rejects malformed Origin values", () => {
  const request = new Request(url, { method: "POST", headers: { origin: "not-a-url" } });
  assert.equal(isSameOriginRequest(request), false);
});

test("allows safe reads without an Origin header", () => {
  const request = new Request(url, { method: "GET" });
  assert.equal(isSameOriginCookieRequest(request), true);
});
