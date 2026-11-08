import assert from "node:assert/strict";
import test from "node:test";
import {
  hasRecentAuthentication,
  MAX_AUTH_TIME_AGE_SECONDS,
} from "../lib/domain/session";

const now = 1_800_000_000;

test("accepts a recently authenticated Firebase user", () => {
  assert.equal(hasRecentAuthentication(now - 30, now), true);
});

test("accepts authentication at the maximum allowed age", () => {
  assert.equal(hasRecentAuthentication(now - MAX_AUTH_TIME_AGE_SECONDS, now), true);
});

test("rejects an ID token from an old sign-in", () => {
  assert.equal(hasRecentAuthentication(now - MAX_AUTH_TIME_AGE_SECONDS - 1, now), false);
});

test("rejects missing, non-numeric, and non-finite auth_time claims", () => {
  for (const value of [undefined, null, "1800000000", Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
    assert.equal(hasRecentAuthentication(value, now), false);
  }
});

test("allows only a small clock-skew window for future auth_time", () => {
  assert.equal(hasRecentAuthentication(now + 30, now), true);
  assert.equal(hasRecentAuthentication(now + 61, now), false);
});
