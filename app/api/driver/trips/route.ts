import { NextResponse } from "next/server";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function label(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const text = (value as Record<string, unknown>).label;
  return typeof text === "string" ? text.trim().slice(0, 180) || null : null;
}

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["driver"])) {
    return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });
  }

  try {
    const snapshot = await getServerDb().collection("trips")
      .where("assignedDriverUid", "==", user.uid)
      .limit(100)
      .get();

    const trips = snapshot.docs.map((doc) => {
      const trip = doc.data();
      return {
        tripId: doc.id,
        status: typeof trip.status === "string" ? trip.status : "unknown",
        pickupLabel: label(trip.pickup),
        destinationLabel: label(trip.destination),
        fareEstimate: typeof trip.fareEstimate === "number" && Number.isFinite(trip.fareEstimate)
          ? trip.fareEstimate : null,
        distanceKm: typeof trip.distanceKm === "number" && Number.isFinite(trip.distanceKm)
          ? trip.distanceKm : null,
        createdAt: toIso(trip.createdAt),
        completedAt: toIso(trip.completedAt),
      };
    }).sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) -
      (a.createdAt ? Date.parse(a.createdAt) : 0));

    return NextResponse.json({ ok: true, trips }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "driver_trips_read_failed" }, { status: 503 });
  }
}
