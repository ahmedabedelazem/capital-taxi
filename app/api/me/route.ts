import { NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let user;

  try {
    user = await verifyRequestUser(request);
  } catch {
    return NextResponse.json(
      { ok: false, error: "authentication_service_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        uid: user.uid,
        role: user.role,
        ...(user.email ? { email: user.email } : {}),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
