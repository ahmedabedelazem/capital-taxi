import "server-only";

import { getServerAuth } from "@/lib/server/firebase-admin";

export type AppRole = "customer" | "driver" | "admin";

export interface AuthenticatedUser {
  uid: string;
  role: AppRole;
  email?: string;
}

const validRoles: readonly AppRole[] = ["customer", "driver", "admin"];

export async function verifyRequestUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) return null;

  try {
    // checkRevoked=true also rejects tokens revoked by the trusted admin process.
    const decoded = await getServerAuth().verifyIdToken(idToken, true);
    const claimRole = decoded.role;
    const role: AppRole =
      typeof claimRole === "string" &&
      validRoles.includes(claimRole as AppRole)
        ? (claimRole as AppRole)
        : "customer";

    return {
      uid: decoded.uid,
      role,
      ...(typeof decoded.email === "string" ? { email: decoded.email } : {}),
    };
  } catch {
    return null;
  }
}

export function hasRole(
  user: AuthenticatedUser,
  allowed: readonly AppRole[],
): boolean {
  return allowed.includes(user.role);
}
