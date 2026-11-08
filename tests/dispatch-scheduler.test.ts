import assert from "node:assert/strict";
import test from "node:test";

import { selectDispatchBatch, type DispatchTask } from "../lib/domain/dispatch-scheduler";

const tasks = (prefix: string, count: number, stage: number): DispatchTask[] =>
  Array.from({ length: count }, (_, index) => ({ tripId: `${prefix}-${index}`, stage }));

test("alternates pending and searching queues without changing their internal order", () => {
  const pending = tasks("pending", 4, 0);
  const searching = tasks("searching", 4, 2);

  assert.deepEqual(selectDispatchBatch(pending, searching, 6), [
    pending[0], searching[0],
    pending[1], searching[1],
    pending[2], searching[2],
  ]);
});

test("uses remaining capacity when one queue is smaller or empty", () => {
  const pending = tasks("pending", 2, 0);
  const searching = tasks("searching", 5, 1);

  assert.deepEqual(selectDispatchBatch(pending, searching, 5), [
    pending[0], searching[0],
    pending[1], searching[1],
    searching[2],
  ]);
  assert.deepEqual(selectDispatchBatch([], searching, 3), searching.slice(0, 3));
  assert.deepEqual(selectDispatchBatch(pending, [], 3), pending);
});

test("returns all available work up to the limit and validates the limit", () => {
  const pending = tasks("pending", 3, 0);
  const searching = tasks("searching", 2, 1);

  assert.deepEqual(selectDispatchBatch(pending, searching, 20), [
    pending[0], searching[0], pending[1], searching[1], pending[2],
  ]);
  assert.deepEqual(selectDispatchBatch(pending, searching, 0), []);
  assert.deepEqual(selectDispatchBatch(pending, searching, 1.5), []);
});
