/**
 * Firebase recommends exchanging an ID token for a session cookie only
 * shortly after the user authenticated. This limits the value of a stolen,
 * still-valid ID token for creating a long-lived server session.
 */
export const MAX_AUTH_TIME_AGE_SECONDS = 5 * 60;
const ALLOWED_CLOCK_SKEW_SECONDS = 60;

export function hasRecentAuthentication(
  authTime: unknown,
  nowSeconds = Date.now() / 1000,
): boolean {
  if (
    typeof authTime !== "number" ||
    !Number.isFinite(authTime) ||
    authTime <= 0 ||
    !Number.isFinite(nowSeconds) ||
    nowSeconds <= 0
  ) {
    return false;
  }

  const ageSeconds = nowSeconds - authTime;
  return (
    ageSeconds <= MAX_AUTH_TIME_AGE_SECONDS &&
    ageSeconds >= -ALLOWED_CLOCK_SKEW_SECONDS
  );
}
