import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function safeLabel(value: unknown): string | null {
  return typeof value === "string" ? value.trim().slice(0, 180) || null : null;
}

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["driver"])) return NextResponse.json({ ok: false, error: "approved_driver_required" }, { status: 403 });

  try {
    const db = getServerDb();
    const driver = await db.collection("drivers").doc(user.uid).get();
    if (!driver.exists || driver.data()?.isAvailable !== true) {
      return NextResponse.json({ ok: true, offers: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const snapshot = await db.collection("tripOffers")
      .where("driverUid", "==", user.uid)
      .limit(50)
      .get();
    const now = Date.now();
    const eligible = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          tripId: typeof data.tripId === "string" ? data.tripId : null,
          status: typeof data.status === "string" ? data.status : null,
          expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt : null,
        };
      })
      .filter((offer) => offer.status === "offered" &&
        offer.expiresAt !== null &&
        offer.expiresAt.toMillis() > now)
      .slice(0, 20);

    const offers = await Promise.all(eligible.map(async (offer) => {
      if (typeof offer.tripId !== "string") return null;
      const tripSnapshot = await db.collection("trips").doc(offer.tripId).get();
      if (!tripSnapshot.exists) return null;
      const trip = tripSnapshot.data() ?? {};
      if (trip.status !== "searching" || trip.assignedDriverUid) return null;
      const pickup = trip.pickup && typeof trip.pickup === "object" ? trip.pickup as Record<string, unknown> : {};
      const destination = trip.destination && typeof trip.destination === "object" ? trip.destination as Record<string, unknown> : {};
      return {
        offerId: offer.id,
        tripId: offer.tripId,
        pickupLabel: safeLabel(pickup.label),
        destinationLabel: safeLabel(destination.label),
        fareEstimate: typeof trip.fareEstimate === "number" && Number.isFinite(trip.fareEstimate)
          ? trip.fareEstimate
          : null,
        expiresAt: offer.expiresAt.toDate().toISOString(),
      };
    }));

    return NextResponse.json({
      ok: true,
      offers: offers.filter((offer): offer is NonNullable<typeof offer> => offer !== null),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "offers_read_failed" }, { status: 503 });
  }
}
