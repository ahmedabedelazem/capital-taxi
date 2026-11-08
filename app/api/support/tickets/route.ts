import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerDb } from "@/lib/server/firebase-admin";
import { hasRole, verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const categories = ["trip", "payment", "driver", "account", "app", "other"] as const;


function serializeTicketDate(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return value instanceof Date ? value.toISOString() : null;
}

export async function GET(request: Request) {
  let user;
  try { user = await verifyRequestUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["customer", "driver"])) {
    return NextResponse.json({ ok: false, error: "support_request_not_allowed" }, { status: 403 });
  }

  try {
    const snapshot = await getServerDb().collection("supportTickets")
      .where("uid", "==", user.uid).limit(50).get();
    const tickets = snapshot.docs
      .sort((a, b) => {
        const left = a.data().createdAt?.toMillis?.() ?? 0;
        const right = b.data().createdAt?.toMillis?.() ?? 0;
        return right - left;
      })
      .map((doc) => {
        const data = doc.data();
        return {
          ticketId: doc.id,
          category: data.category ?? "other",
          subject: data.subject ?? "",
          description: data.description ?? "",
          tripId: data.tripId ?? null,
          status: data.status ?? "open",
          adminNote: data.adminNote ?? null,
          createdAt: serializeTicketDate(data.createdAt),
          updatedAt: serializeTicketDate(data.updatedAt),
          resolvedAt: serializeTicketDate(data.resolvedAt),
        };
      });
    return NextResponse.json({ ok: true, tickets }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "support_tickets_read_failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let user;
  try { user = await verifyRequestUser(request); } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasRole(user, ["customer", "driver"])) {
    return NextResponse.json({ ok: false, error: "support_request_not_allowed" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const category = typeof data.category === "string" && categories.includes(data.category as typeof categories[number])
    ? data.category : null;
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const tripId = typeof data.tripId === "string" && data.tripId.trim() ? data.tripId.trim() : null;

  if (!category || subject.length < 5 || subject.length > 120 ||
      description.length < 10 || description.length > 2500 ||
      (tripId !== null && tripId.length > 128)) {
    return NextResponse.json({ ok: false, error: "invalid_support_ticket" }, { status: 400 });
  }

  const db = getServerDb();
  const ticketRef = db.collection("supportTickets").doc();
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  const rateId = createHash("sha256").update(user.uid).digest("hex");
  const rateRef = db.collection("supportRateLimits").doc(`${rateId}_${bucket}`);

  try {
    await db.runTransaction(async (transaction) => {
      if (tripId) {
        const tripRef = db.collection("trips").doc(tripId);
        const trip = await transaction.get(tripRef);
        const tripData = trip.data();
        const isRelated = trip.exists && (
          (user.role === "customer" && tripData?.customerUid === user.uid) ||
          (user.role === "driver" && tripData?.assignedDriverUid === user.uid)
        );
        if (!isRelated) throw new Error("TRIP_NOT_ACCESSIBLE");
      }

      const rateSnapshot = await transaction.get(rateRef);
      const count = Number(rateSnapshot.data()?.count ?? 0);
      if (count >= 5) throw new Error("SUPPORT_RATE_LIMIT");
      transaction.set(rateRef, {
        uid: user.uid,
        count: count + 1,
        bucketStartedAt: new Date(bucket * 15 * 60 * 1000),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.create(ticketRef, {
        uid: user.uid,
        userRole: user.role,
        category,
        subject,
        description,
        tripId,
        status: "open",
        priority: "normal",
        adminNote: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        resolvedAt: null,
      });
    });

    return NextResponse.json({ ok: true, ticketId: ticketRef.id, status: "open" }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TRIP_NOT_ACCESSIBLE") {
      return NextResponse.json({ ok: false, error: "trip_not_accessible" }, { status: 403 });
    }
    if (code === "SUPPORT_RATE_LIMIT") {
      return NextResponse.json({ ok: false, error: "support_rate_limit" }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: "support_ticket_create_failed" }, { status: 503 });
  }
}
