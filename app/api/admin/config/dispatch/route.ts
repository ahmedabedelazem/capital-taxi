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
    const snapshot = await getServerDb().collection("config").doc("dispatch").get();
    return NextResponse.json({ ok: true, config: snapshot.exists ? snapshot.data() : null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "dispatch_read_failed" }, { status: 503 });
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
  const radii = data.stageRadiiKm;
  if (!Array.isArray(radii) || radii.length < 1 || radii.length > 6 ||
      !radii.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100) ||
      radii.some((value, index) => index > 0 && value <= (radii[index - 1] as number)) ||
      typeof data.offerTtlSeconds !== "number" || !Number.isInteger(data.offerTtlSeconds) ||
      data.offerTtlSeconds < 15 || data.offerTtlSeconds > 300 ||
      typeof data.maxOffersPerStage !== "number" || !Number.isInteger(data.maxOffersPerStage) ||
      data.maxOffersPerStage < 1 || data.maxOffersPerStage > 30) {
    return NextResponse.json({ ok: false, error: "invalid_dispatch_configuration" }, { status: 400 });
  }

  try {
    const db = getServerDb();
    const ref = db.collection("config").doc("dispatch");
    await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(ref);
      transaction.set(ref, {
        stageRadiiKm: radii,
        offerTtlSeconds: data.offerTtlSeconds,
        maxOffersPerStage: data.maxOffersPerStage,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });
      transaction.create(db.collection("adminAuditLogs").doc(), {
        action: "dispatch_config_updated",
        actorUid: user.uid,
        previousExists: previous.exists,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "dispatch_save_failed" }, { status: 503 });
  }
}
