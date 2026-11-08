import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionTrip,
  isTripStatus,
  TRIP_STATUSES,
  type TripActor,
  type TripStatus,
} from "../lib/domain/trip";

const expectedTransitions: Record<TripStatus, readonly TripStatus[]> = {
  pending: ["searching", "cancelled"],
  searching: ["accepted", "cancelled", "no_driver"],
  accepted: ["driver_arrived", "cancelled"],
  driver_arrived: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_driver: [],
};

const actorPermissions: Record<TripActor, readonly TripStatus[]> = {
  customer: ["cancelled"],
  driver: ["driver_arrived", "in_progress", "completed", "cancelled"],
  admin: ["cancelled", "no_driver"],
  system: ["searching", "accepted", "no_driver"],
};

const actors: readonly TripActor[] = ["customer", "driver", "admin", "system"];

test("the domain exposes exactly the supported trip statuses", () => {
  assert.deepEqual([...TRIP_STATUSES], [
    "pending",
    "searching",
    "accepted",
    "driver_arrived",
    "in_progress",
    "completed",
    "cancelled",
    "no_driver",
  ]);
  for (const status of TRIP_STATUSES) assert.equal(isTripStatus(status), true);
  for (const invalid of ["", "PENDING", "unknown", null, 1, {}, undefined]) {
    assert.equal(isTripStatus(invalid), false);
  }
});

test("every status/actor transition combination follows the policy matrix", () => {
  for (const current of TRIP_STATUSES) {
    for (const next of TRIP_STATUSES) {
      for (const actor of actors) {
        const isEdge = expectedTransitions[current].includes(next);
        const actorCanPerform = actorPermissions[actor].includes(next);
        const result = canTransitionTrip({ current, next, actor });

        if (!isEdge) {
          assert.deepEqual(result, {
            allowed: false,
            reason: "invalid_transition",
          }, `${actor}: ${current} -> ${next} must be an invalid edge`);
        } else if (!actorCanPerform) {
          assert.deepEqual(result, {
            allowed: false,
            reason: "actor_not_allowed",
          }, `${actor}: ${current} -> ${next} must be actor-restricted`);
        } else {
          assert.deepEqual(result, { allowed: true, status: next });
        }
      }
    }
  }
});

test("completed and terminal trips cannot transition again", () => {
  for (const current of ["completed", "cancelled", "no_driver"] as const) {
    for (const next of TRIP_STATUSES) {
      for (const actor of actors) {
        assert.deepEqual(
          canTransitionTrip({ current, next, actor }),
          { allowed: false, reason: "invalid_transition" },
        );
      }
    }
  }
});
