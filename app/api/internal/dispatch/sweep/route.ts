import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { selectDispatchBatch, type DispatchTask } from "@/lib/domain/dispatch-scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const expected = process.env.DISPATCH_WORKER_SECRET;
  const supplied = request.headers.get("x-dispatch-secret");
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function appBaseUrl(): string | null {
  const configured = process.env.APP_BASE_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = appBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ ok: false, error: "app_base_url_not_configured" }, { status: 503 });
  }

  try {
    const db = getServerDb();
    const configSnapshot = await db.collection("config").doc("dispatch").get();
    if (!configSnapshot.exists) {
      return NextResponse.json({ ok: false, error: "dispatch_not_configured" }, { status: 503 });
    }
    const config = configSnapshot.data() ?? {};
    const radii = config.stageRadiiKm;
    const ttlSeconds = config.offerTtlSeconds;
    const maxOffers = config.maxOffersPerStage;
    if (!Array.isArray(radii) || !radii.length || radii.length > 6 ||
        !radii.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0) ||
        radii.some((value, index) => index > 0 && value <= (radii[index - 1] as number)) ||
        typeof ttlSeconds !== "number" || !Number.isInteger(ttlSeconds) || ttlSeconds < 15 || ttlSeconds > 300 ||
        typeof maxOffers !== "number" || !Number.isInteger(maxOffers) || maxOffers < 1 || maxOffers > 30) {
      return NextResponse.json({ ok: false, error: "dispatch_not_configured" }, { status: 503 });
    }

    const now = Date.now();
    const dispatchCutoff = Timestamp.fromMillis(now - ttlSeconds * 1000);
    const [pendingSnapshot, searchingSnapshot] = await Promise.all([
      db.collection("trips")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .limit(30)
        .get(),
      db.collection("trips")
        .where("status", "==", "searching")
        .where("lastDispatchAt", "<=", dispatchCutoff)
        .orderBy("lastDispatchAt", "asc")
        .limit(70)
        .get(),
    ]);

    const pendingDue: DispatchTask[] = pendingSnapshot.docs.map((snapshot) => ({
      tripId: snapshot.id,
      stage: 0,
    }));
    const searchingDue: DispatchTask[] = [];
    for (const snapshot of searchingSnapshot.docs) {
      const trip = snapshot.data();
      const stage = typeof trip.dispatchStage === "number" && Number.isInteger(trip.dispatchStage)
        ? trip.dispatchStage : 0;
      if (stage >= 1 && stage <= radii.length) {
        searchingDue.push({ tripId: snapshot.id, stage });
      }
    }

    const due = pendingDue.length + searchingDue.length;
    // Alternate the two queues so a constant stream of new requests cannot
    // monopolize the worker and delay trips already waiting for a driver.
    const batch = selectDispatchBatch(pendingDue, searchingDue, 20);
    let processed = 0;
    let deferred = 0;
    let failed = 0;
    const endpoint = new URL("/api/internal/dispatch", baseUrl);
    for (let offset = 0; offset < batch.length; offset += 5) {
      const results = await Promise.all(batch.slice(offset, offset + 5).map(async (item) => {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-dispatch-secret": process.env.DISPATCH_WORKER_SECRET!,
            },
            body: JSON.stringify(item),
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
          });
          if (response.ok) return "processed" as const;
          if (response.status === 409) return "deferred" as const;
          return "failed" as const;
        } catch {
          return "failed" as const;
        }
      }));
      for (const result of results) {
        if (result === "processed") processed += 1;
        else if (result === "deferred") deferred += 1;
        else failed += 1;
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      scanned: pendingSnapshot.size + searchingSnapshot.size,
      due,
      processed,
      deferred,
      failed,
      truncated: due > batch.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "dispatch_sweep_failed" }, { status: 503 });
  }
}
