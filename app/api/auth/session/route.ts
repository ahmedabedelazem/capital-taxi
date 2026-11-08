import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { isSameOriginRequest } from "@/lib/domain/request-security";
import { hasRecentAuthentication } from "@/lib/domain/session";

export const dynamic = "force-dynamic";

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request_origin" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const idToken =
    body && typeof body === "object" && "idToken" in body &&
    typeof body.idToken === "string"
      ? body.idToken.trim()
      : "";

  if (!idToken || idToken.length > 10_000) {
    return NextResponse.json(
      { ok: false, error: "missing_or_invalid_id_token" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const auth = getServerAuth();
    const decodedToken = await auth.verifyIdToken(idToken, true);
    if (!hasRecentAuthentication(decodedToken.auth_time)) {
      return NextResponse.json(
        { ok: false, error: "recent_sign_in_required" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "authentication_failed" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request_origin" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
