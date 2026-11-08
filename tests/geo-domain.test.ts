import assert from "node:assert/strict";
import test from "node:test";

import { distanceKm, encodeGeohash, isValidPoint } from "../lib/domain/geo";

test("validates geographic coordinate bounds and finite numbers", () => {
  assert.equal(isValidPoint({ lat: 29.95, lng: 32.9 }), true);
  assert.equal(isValidPoint({ lat: -90, lng: 180 }), true);
  assert.equal(isValidPoint({ lat: 90.01, lng: 0 }), false);
  assert.equal(isValidPoint({ lat: 0, lng: -180.01 }), false);
  assert.equal(isValidPoint({ lat: Number.NaN, lng: 0 }), false);
  assert.equal(isValidPoint({ lat: 0, lng: Number.POSITIVE_INFINITY }), false);
  assert.equal(isValidPoint(null), false);
  assert.equal(isValidPoint({ lat: "29.95", lng: 32.9 }), false);
});

test("calculates zero distance for the same point", () => {
  assert.equal(distanceKm({ lat: 29.95, lng: 32.9 }, { lat: 29.95, lng: 32.9 }), 0);
});

test("calculates known short and long distances symmetrically", () => {
  const north = { lat: 30, lng: 31 };
  const south = { lat: 31, lng: 31 };
  const east = { lat: 30, lng: 32 };
  assert.ok(distanceKm(north, south) > 111 && distanceKm(north, south) < 112);
  assert.ok(distanceKm(north, east) > 96 && distanceKm(north, east) < 97);
  assert.ok(Math.abs(distanceKm(north, south) - distanceKm(south, north)) < 1e-9);
});

test("handles antimeridian and antipodal points without NaN", () => {
  const acrossDateLine = distanceKm({ lat: 0, lng: 179.9 }, { lat: 0, lng: -179.9 });
  const antipodal = distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
  assert.ok(Number.isFinite(acrossDateLine) && acrossDateLine > 20 && acrossDateLine < 23);
  assert.ok(Number.isFinite(antipodal) && antipodal > 20_000);
});

test("encodes standard geohash vectors and supports precision", () => {
  assert.equal(encodeGeohash({ lat: 42.6, lng: -5.6 }, 9), "ezs42e44y");
  assert.equal(encodeGeohash({ lat: 0, lng: 0 }, 9), "s00000000");
  assert.equal(encodeGeohash({ lat: 0, lng: 0 }, 5), "s0000");
});

test("rejects invalid geohash input and precision", () => {
  assert.throws(() => encodeGeohash({ lat: 91, lng: 0 }), /invalid_geographic_point/);
  assert.throws(() => encodeGeohash({ lat: 0, lng: 0 }, 0), /invalid_geohash_precision/);
  assert.throws(() => encodeGeohash({ lat: 0, lng: 0 }, 13), /invalid_geohash_precision/);
});
