import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";

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
    if (!Array.isArray(radii) || !radii.length ||
        !radii.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0) ||
        typeof ttlSeconds !== "number" || !Number.isInteger(ttlSeconds) || ttlSeconds < 15 || ttlSeconds > 300) {
      return NextResponse.json({ ok: false, error: "dispatch_not_configured" }, { status: 503 });
    }

    const [pendingSnapshot, searchingSnapshot] = await Promise.all([
      db.collection("trips").where("status", "==", "pending").limit(30).get(),
      db.collection("trips").where("status", "==", "searching").limit(70).get(),
    ]);
    const now = Date.now();
    const due: Array<{ tripId: string; stage: number }> = [];

    for (const snapshot of pendingSnapshot.docs) {
      due.push({ tripId: snapshot.id, stage: 0 });
    }

    for (const snapshot of searchingSnapshot.docs) {
      const trip = snapshot.data();
      const stage = typeof trip.dispatchStage === "number" && Number.isInteger(trip.dispatchStage)
        ? trip.dispatchStage : 0;
      if (stage < 1 || stage > radii.length) continue;
      const lastDispatchAt = trip.lastDispatchAt instanceof Timestamp
        ? trip.lastDispatchAt.toMillis()
        : trip.createdAt instanceof Timestamp ? trip.createdAt.toMillis() : 0;
      if (now - lastDispatchAt >= ttlSeconds * 1000) {
        due.push({ tripId: snapshot.id, stage });
      }
    }

    let processed = 0;
    let deferred = 0;
    let failed = 0;
    const endpoint = new URL("/api/internal/dispatch", baseUrl);
    for (const item of due.slice(0, 50)) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dispatch-secret": process.env.DISPATCH_WORKER_SECRET!,
          },
          body: JSON.stringify(item),
          cache: "no-store",
          signal: AbortSignal.timeout(12_000),
        });
        if (response.ok) processed += 1;
        else if (response.status === 409) deferred += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      scanned: pendingSnapshot.size + searchingSnapshot.size,
      due: due.length,
      processed,
      deferred,
      failed,
      truncated: due.length > 50,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "dispatch_sweep_failed" }, { status: 503 });
  }
}
