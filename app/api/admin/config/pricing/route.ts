import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

async function adminUser(request: Request) {
  const user = await verifyRequestUser(request);
  return user && hasRole(user, ["admin"]) ? user : null;
}

export async function GET(request: Request) {
  let user;
  try { user = await adminUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const snapshot = await getServerDb().collection("config").doc("tripPricing").get();
    return NextResponse.json({ ok: true, config: snapshot.exists ? snapshot.data() : null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "pricing_read_failed" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  let user;
  try { user = await adminUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const numeric = ["baseFare", "perKm", "minimumFare", "maximumDistanceKm", "roundingIncrement"] as const;
  for (const key of numeric) {
    const value = data[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return NextResponse.json({ ok: false, error: "invalid_pricing_values" }, { status: 400 });
    }
  }
  if ((data.maximumDistanceKm as number) <= 0 || (data.roundingIncrement as number) <= 0 ||
      (data.baseFare as number) > 100000 || (data.perKm as number) > 10000 ||
      (data.minimumFare as number) > 100000 || (data.maximumDistanceKm as number) > 500 ||
      (data.roundingIncrement as number) > 1000 || typeof data.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_pricing_values" }, { status: 400 });
  }
  const area = data.serviceArea && typeof data.serviceArea === "object"
    ? data.serviceArea as Record<string, unknown> : {};
  const bounds = ["minLat", "maxLat", "minLng", "maxLng"] as const;
  if (!bounds.every((key) => typeof area[key] === "number" && Number.isFinite(area[key])) ||
      (area.minLat as number) < -90 || (area.maxLat as number) > 90 ||
      (area.minLng as number) < -180 || (area.maxLng as number) > 180 ||
      (area.minLat as number) >= (area.maxLat as number) ||
      (area.minLng as number) >= (area.maxLng as number)) {
    return NextResponse.json({ ok: false, error: "invalid_service_area" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const ref = db.collection("config").doc("tripPricing");
    await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(ref);
      transaction.set(ref, {
        enabled: data.enabled,
        baseFare: data.baseFare,
        perKm: data.perKm,
        minimumFare: data.minimumFare,
        maximumDistanceKm: data.maximumDistanceKm,
        roundingIncrement: data.roundingIncrement,
        serviceArea: {
          minLat: area.minLat, maxLat: area.maxLat,
          minLng: area.minLng, maxLng: area.maxLng,
        },
        version: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });
      transaction.create(db.collection("adminAuditLogs").doc(), {
        action: "trip_pricing_updated",
        actorUid: user.uid,
        previousExists: previous.exists,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "pricing_save_failed" }, { status: 503 });
  }
}
