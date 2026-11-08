/**
 * Shared trip domain rules.
 *
 * This module is deliberately free of Firebase and browser dependencies so it
 * can be reused by trusted server handlers and tested independently.
 * It does not authorize callers or persist data; those remain server duties.
 */

export const TRIP_STATUSES = [
  "pending",
  "searching",
  "accepted",
  "driver_arrived",
  "in_progress",
  "completed",
  "cancelled",
  "no_driver",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];
export type TripActor = "customer" | "driver" | "admin" | "system";

const transitions: Record<TripStatus, readonly TripStatus[]> = {
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

export interface TripTransitionInput {
  current: TripStatus;
  next: TripStatus;
  actor: TripActor;
}

export type TripTransitionResult =
  | { allowed: true; status: TripStatus }
  | {
      allowed: false;
      reason: "invalid_transition" | "actor_not_allowed";
    };

export function isTripStatus(value: unknown): value is TripStatus {
  return (
    typeof value === "string" &&
    (TRIP_STATUSES as readonly string[]).includes(value)
  );
}

export function canTransitionTrip({
  current,
  next,
  actor,
}: TripTransitionInput): TripTransitionResult {
  if (!transitions[current].includes(next)) {
    return { allowed: false, reason: "invalid_transition" };
  }

  if (!actorPermissions[actor].includes(next)) {
    return { allowed: false, reason: "actor_not_allowed" };
  }

  return { allowed: true, status: next };
}

/**
 * A server handler must additionally verify identity, ownership, driver
 * approval/assignment, current database version, and perform the write in a
 * transaction. A successful result here is not an authorization decision.
 */
