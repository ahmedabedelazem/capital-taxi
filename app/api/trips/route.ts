import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type PlaceInput = { label: string; lat: number; lng: number };

function parsePlace(value: unknown): PlaceInput | null {
  if (!value || typeof value !== "object") return null;
  const place = value as Record<string, unknown>;
  if (typeof place.label !== "string" || !place.label.trim() || place.label.length > 180) return null;
  if (typeof place.lat !== "number" || !Number.isFinite(place.lat) || place.lat < -90 || place.lat > 90) return null;
  if (typeof place.lng !== "number" || !Number.isFinite(place.lng) || place.lng < -180 || place.lng > 180) return null;
  return { label: place.label.trim(), lat: place.lat, lng: place.lng };
}

function distanceKm(a: PlaceInput, b: PlaceInput): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function isInsideArea(place: PlaceInput, area: Record<string, unknown>): boolean {
  const minLat = area.minLat;
  const maxLat = area.maxLat;
  const minLng = area.minLng;
  const maxLng = area.maxLng;
  return [minLat, maxLat, minLng, maxLng].every((v) => typeof v === "number" && Number.isFinite(v)) &&
    place.lat >= (minLat as number) && place.lat <= (maxLat as number) &&
    place.lng >= (minLng as number) && place.lng <= (maxLng as number);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["customer"])) return NextResponse.json({ ok: false, error: "customer_account_required" }, { status: 403 });

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 128) {
    return NextResponse.json({ ok: false, error: "valid_idempotency_key_required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const pickup = parsePlace(data.pickup);
  const destination = parsePlace(data.destination);
  if (!pickup || !destination) {
    return NextResponse.json({ ok: false, error: "invalid_pickup_or_destination" }, { status: 400 });
  }
  if (pickup.lat === destination.lat && pickup.lng === destination.lng) {
    return NextResponse.json({ ok: false, error: "pickup_and_destination_must_differ" }, { status: 400 });
  }

  const db = getServerDb();
  const pricingRef = db.collection("config").doc("tripPricing");
  const requestHash = createHash("sha256").update(`${user.uid}:${idempotencyKey}`).digest("hex");
  const idempotencyRef = db.collection("tripIdempotency").doc(requestHash);
  const tripRef = db.collection("trips").doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const [existingRequest, pricingSnapshot] = await Promise.all([
        transaction.get(idempotencyRef),
        transaction.get(pricingRef),
      ]);
      if (existingRequest.exists) {
        const previous = existingRequest.data() ?? {};
        return {
          tripId: previous.tripId as string,
          fareEstimate: previous.fareEstimate as number,
          distanceKm: previous.distanceKm as number,
          reused: true,
        };
      }
      if (!pricingSnapshot.exists) throw new Error("PRICING_NOT_CONFIGURED");
      const pricing = pricingSnapshot.data() ?? {};
      const area = pricing.serviceArea && typeof pricing.serviceArea === "object"
        ? pricing.serviceArea as Record<string, unknown>
        : {};
      if (pricing.enabled !== true ||
          !isInsideArea(pickup, area) ||
          !isInsideArea(destination, area)) {
        throw new Error("OUTSIDE_SERVICE_AREA");
      }

      const baseFare = pricing.baseFare;
      const perKm = pricing.perKm;
      const minimumFare = pricing.minimumFare;
      const maximumDistanceKm = pricing.maximumDistanceKm;
      const roundingIncrement = pricing.roundingIncrement ?? 1;
      if (![baseFare, perKm, minimumFare, maximumDistanceKm, roundingIncrement]
        .every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ||
        (roundingIncrement as number) <= 0) {
        throw new Error("INVALID_PRICING_CONFIGURATION");
      }

      const distance = distanceKm(pickup, destination);
      if (distance <= 0 || distance > (maximumDistanceKm as number)) {
        throw new Error("TRIP_DISTANCE_NOT_SUPPORTED");
      }
      const rawFare = Math.max(minimumFare as number, (baseFare as number) + distance * (perKm as number));
      const fareEstimate = Math.ceil(rawFare / (roundingIncrement as number)) * (roundingIncrement as number);

      transaction.create(tripRef, {
        customerUid: user.uid,
        pickup,
        destination,
        distanceKm: Number(distance.toFixed(2)),
        fareEstimate: Number(fareEstimate.toFixed(2)),
        pricingVersion: typeof pricing.version === "string" ? pricing.version : "unversioned",
        status: "pending",
        assignedDriverUid: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(idempotencyRef, {
        customerUid: user.uid,
        tripId: tripRef.id,
        fareEstimate: Number(fareEstimate.toFixed(2)),
        distanceKm: Number(distance.toFixed(2)),
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.create(tripRef.collection("statusTimeline").doc(), {
        from: null,
        to: "pending",
        actorType: "customer",
        actorUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return {
        tripId: tripRef.id,
        fareEstimate: Number(fareEstimate.toFixed(2)),
        distanceKm: Number(distance.toFixed(2)),
        reused: false,
      };
    });

    return NextResponse.json({ ok: true, ...result, status: "pending" }, {
      status: result.reused ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PRICING_NOT_CONFIGURED" || code === "INVALID_PRICING_CONFIGURATION") {
      return NextResponse.json({ ok: false, error: "pricing_not_configured" }, { status: 503 });
    }
    if (code === "OUTSIDE_SERVICE_AREA") return NextResponse.json({ ok: false, error: "outside_service_area" }, { status: 422 });
    if (code === "TRIP_DISTANCE_NOT_SUPPORTED") return NextResponse.json({ ok: false, error: "trip_distance_not_supported" }, { status: 422 });
    return NextResponse.json({ ok: false, error: "trip_creation_failed" }, { status: 503 });
  }
}
