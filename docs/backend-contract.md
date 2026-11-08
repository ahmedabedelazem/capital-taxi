# CAPITAL TAXI — Backend Contract (Draft)

## Scope and status

This document defines the server boundary before any live Firebase integration.
The current customer, driver, and admin screens are presentation prototypes.
No endpoint described here should be treated as deployed or operational.

## Non-negotiable security boundary

- The browser is untrusted. Never accept a role, driver approval flag, fare,
  wallet balance, commission, payment result, or admin identity as authoritative
  merely because it appears in a request body.
- Verify Firebase ID tokens and session cookies on the server using the Firebase Admin SDK. Session cookies are HttpOnly, SameSite=Lax, Secure in production, and expire after five days.
- Resolve roles and approval state from trusted server-side records or verified
  custom claims. Never grant administrator access by matching an email substring.
- Keep service-account credentials and all private keys in server environment
  secrets. Never put them in `NEXT_PUBLIC_*`, source files, logs, or commits.
- Do not loosen Realtime Database, Firestore, or Storage rules to make a client
  workflow work. Client writes to financial ledgers and privileged records must
  remain denied.
- Validate every request on the server, apply rate limits, and return only the
  minimum personal data needed for the current workflow.

## Implemented authentication surface\n\n| Method | Route | Purpose | Behavior |\n| --- | --- | --- | --- |\n| POST | `/api/auth/session` | Exchange Firebase ID token for a server session | Verifies token and revocation state, then sets an HttpOnly session cookie |\n| DELETE | `/api/auth/session` | Clear current session | Expires the session cookie in the browser |\n| GET | `/api/me` | Resolve current user | Accepts a verified session cookie or Bearer ID token; returns UID, signed role claim, and email only |\n\nRoles are read only from Firebase-signed custom claims. A missing or unknown role fails closed to `customer`. Only a trusted server-side provisioning process may assign `driver` or `admin` custom claims. The session endpoint does not assign roles.\n\n## Proposed API surface

Session authentication routes are implemented; trip, dispatch, and financial routes below remain proposals, not implemented endpoints.

| Method | Route | Purpose | Required server checks |
| --- | --- | --- | --- |
| POST | `/api/trips` | Create a trip request | Authenticated customer, validated locations, server-calculated quote, idempotency key |
| GET | `/api/trips/:tripId` | Read trip details | Customer owner, assigned driver, or authorized admin |
| POST | `/api/trips/:tripId/cancel` | Cancel a trip | Authorized participant, permitted state transition, cancellation policy |
| POST | `/api/driver/availability` | Change availability | Authenticated, approved driver; server-owned availability record |
| POST | `/api/trips/:tripId/accept` | Accept an offer | Approved available driver, eligible offer, atomic transaction/compare-and-set |
| POST | `/api/trips/:tripId/status` | Advance trip state | Assigned driver or authorized system/admin; legal transition |
| GET | `/api/driver/offers` | List eligible offers | Approved driver; return only the minimum pickup/route data |
| GET | `/api/me` | Resolve current profile and role | Verified ID token; role resolved server-side |

## Trip creation and dispatch

1. Verify the caller's ID token and customer role.
2. Validate pickup/destination text and coordinates; reject malformed or
   out-of-service-area coordinates.
3. Calculate the fare on the server from the active admin-managed tariff.
   Ignore any client-supplied fare or distance total.
4. Require an idempotency key and persist its result so retries cannot create
   duplicate trips.
5. Create the trip and its status timeline atomically where supported.
6. Dispatch eligible drivers in controlled distance bands. Do not expose the
   customer's phone number or full profile to drivers before assignment.
7. Accept an offer with a database transaction or conditional write so exactly
   one driver can win. Re-check approval, availability, offer expiry, and trip
   status inside that same transaction.
8. Record every state change with actor, server timestamp, and immutable audit
   metadata.

## Financial operations

- Wallet credits/debits, driver payouts, commissions, refunds, and payment
  confirmation must be server-only.
- Use an immutable transaction ledger with unique operation IDs and idempotency.
- Never trust a client callback or screenshot as proof of an e-wallet payment.
- Reconcile provider confirmations before marking a payment settled.

## Data minimization and location

- Ask for browser location only after a clear user action and permission.
- Transmit location only while needed for an active workflow and under a stated
  retention policy.
- Do not log precise coordinates, tokens, phone numbers, or payment details.
- Restrict driver location reads to authorized dispatch and assigned-trip flows.

## Error contract

Return consistent JSON errors without stack traces or secrets:

- `400` invalid input
- `401` missing or invalid authentication
- `403` authenticated but not authorized
- `404` resource unavailable to this caller
- `409` stale state, duplicate operation, or conflicting acceptance
- `429` rate limit exceeded
- `500` generic unexpected server failure

## Delivery gates before enabling production

- Configure and verify server-only Firebase Admin credentials (`FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`, or managed-environment ADC).
- Deploy restrictive database rules and test them against customer, driver,
  admin, and unauthenticated identities.
- Add automated tests for ownership, role escalation, race conditions,
  idempotency, cancellation, and financial ledger invariants.
- Run lint, typecheck, production build, and end-to-end staging tests.
- Complete privacy, retention, incident-response, backup, and monitoring review.
