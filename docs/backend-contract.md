# CAPITAL TAXI — Backend Contract (Draft)

## Scope and status

This document defines the server boundary before any live Firebase integration.
The customer screen is connected to trip creation and status reads, the driver workspace is connected to availability/location/offers/acceptance APIs, and the admin screen remains a presentation prototype.
The endpoints listed under the implemented sections are committed to the repository but are not deployed or connected to a configured Firebase environment.

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

## Implemented authentication surface

| Method | Route | Purpose | Behavior |
| --- | --- | --- | --- |
| POST | `/api/auth/session` | Exchange Firebase ID token for a server session | Verifies token and revocation state, then sets an HttpOnly session cookie |
| DELETE | `/api/auth/session` | Clear current session | Expires the session cookie in the browser |
| GET | `/api/me` | Resolve current user | Accepts a verified session cookie or Bearer ID token; returns UID, signed role claim, and email only |

Roles are read only from Firebase-signed custom claims. A missing or unknown role fails closed to `customer`. Only a trusted server-side provisioning process may assign `driver` or `admin` custom claims. The session endpoint does not assign roles.

## Implemented driver onboarding API

| Method | Route | Purpose | Authorization |
| --- | --- | --- | --- |
| POST | `/api/driver/application` | Submit/update the caller's driver application | Authenticated customer; server stores the application as pending |
| GET | `/api/admin/drivers` | List up to 50 pending driver applications | Verified `admin` custom claim only |
| PATCH | `/api/admin/drivers/:uid/decision` | Approve or reject an application | Verified `admin` custom claim only; writes an audit record |
| GET/PUT | `/api/admin/config/pricing` | Read or update server-side fare and service-area configuration | Verified `admin` custom claim only; writes an audit record |
| GET/PUT | `/api/admin/config/dispatch` | Read or update staged dispatch configuration | Verified `admin` custom claim only; writes an audit record |

The admin configuration APIs validate bounded fare inputs, geographic service-area bounds, ascending dispatch radii, offer TTL, and per-stage offer limits. Updates are written server-side and recorded in `adminAuditLogs`; no browser client writes the config collection directly.

Driver approval is enforced by both a signed Firebase `driver` custom claim and a server-owned `driverApplications/{uid}` record with `status: approved`. The decision endpoint preserves unrelated custom claims and never changes an existing admin role. Driver application data is private server-side data; do not expose the collection directly to browser clients.

## Implemented driver dispatch and acceptance APIs

| Method | Route | Purpose | Authorization |
| --- | --- | --- | --- |
| GET | `/api/driver/availability` | Read the caller's current availability and active trip ID | Verified approved driver |
| POST | `/api/driver/availability` | Set the caller's online/offline state | Verified approved driver; server checks the application record again |
| GET | `/api/driver/offers` | List unexpired offers assigned to the caller | Verified approved and currently available driver |
| POST | `/api/trips/:tripId/accept` | Accept the caller's assigned offer | Verified approved, available driver; Firestore transaction |

The offer endpoint returns only pickup/destination labels, the server-stored fare estimate, expiry, and opaque IDs. It does not return customer name, phone, email, or profile details. An offline driver receives an empty offer list. Availability cannot be turned off while the driver record has an active trip.

Acceptance uses the deterministic offer document ID `tripOffers/{tripId}_{driverUid}`. The transaction re-reads the trip, offer, driver, and application before writing. It requires an unexpired offer addressed to the caller, an approved application, an available driver, and a trip still in `searching` with no assigned driver. It then assigns the driver, marks the offer accepted, marks the driver unavailable with an active trip, and appends a server-timestamped event to `trips/{tripId}/statusTimeline`. Concurrent acceptances conflict on the same trip document; only one can commit.

## Dispatch data contract

The following is the canonical Firestore shape expected by these endpoints. It is a contract, not a migration: no live Firebase collections are created or modified by committing this code.

- `driverApplications/{uid}`: private application and admin-review record; `status` is `pending`, `approved`, or `rejected`.
- `drivers/{uid}`: server-owned operational record with `uid`, `isAvailable`, optional `activeTripId`, and server timestamps. Clients must not write this collection directly.
- `trips/{tripId}`: trip with `status`, optional `assignedDriverUid`, `pickup.label`, `destination.label`, and server-calculated numeric `fareEstimate`. The customer profile and contact data must be stored separately or excluded from the driver offer payload.
- `tripOffers/{tripId}_{driverUid}`: `tripId`, `driverUid`, `status: offered|accepted|expired|withdrawn`, and Firestore Timestamp `expiresAt`. Create offers only from a trusted dispatch service.
- `trips/{tripId}/statusTimeline/{eventId}`: append-only event with `from`, `to`, `actorType`, `actorUid`, and server timestamp `createdAt`.

The worker performs staged proximity selection using the latest driver locations and creates targeted offers. It is an internal API, not a scheduler: a trusted queue or scheduled job must invoke each stage after the configured offer window. It does not create customer trips; the customer trip endpoint creates a pending trip first. The browser cannot nominate itself for an arbitrary trip.

## Implemented customer trip creation API

| Method | Route | Purpose | Authorization |
| --- | --- | --- | --- |
| POST | `/api/trips` | Create a customer trip request and server-side fare estimate | Verified customer session; required idempotency key |
| GET | `/api/trips/:tripId` | Read trip status and latest timeline events | Trip owner, assigned driver, or verified admin |

The request accepts `pickup` and `destination` objects with a short label and numeric latitude/longitude, plus `vehicleCategory` (`economy|family|private`) and `paymentMethod` (`cash|wallet`). The customer UI uses Google Places Autocomplete for address coordinates and browser geolocation only after the customer requests it. The server validates coordinates and preferences, rejects identical endpoints, checks both points against configured service-area bounds, calculates Haversine distance, and calculates the fare from the active server-owned tariff. Client-supplied fare and distance values are ignored. A required `Idempotency-Key` header prevents duplicate trip creation; reusing the same key with a different payload returns 409. Vehicle category and payment method are stored as preferences; the current tariff is not yet category-specific and wallet settlement is not implemented.

The trip read route returns only the trip's operational summary and up to 20 latest timeline events. A non-owner receives 404, avoiding disclosure of whether another customer's trip exists. It does not return customer phone/email or driver private profile details.

The route reads `config/tripPricing` and expects: `enabled: true`, `baseFare`, `perKm`, `minimumFare`, `maximumDistanceKm`, optional `roundingIncrement`, `version`, and `serviceArea: { minLat, maxLat, minLng, maxLng }`. The tariff must be provisioned by a trusted admin process. Missing or invalid pricing fails closed; no hard-coded fare is used. The trip, idempotency record, and initial status timeline event are created in one Firestore transaction.

New trips are created with `status: pending`. This endpoint does not yet dispatch offers; a trusted dispatch worker must move the trip into searching and create targeted offer documents before drivers can see or accept it.

## Implemented staged dispatch worker API

| Method | Route | Purpose | Authorization |
| --- | --- | --- | --- |
| POST | `/api/internal/dispatch` | Send one dispatch wave or finalize an exhausted search | Server-to-server secret in `x-dispatch-secret` |
| POST | `/api/internal/dispatch/sweep` | Find due trips and invoke the next dispatch stage | Same server-to-server secret; trusted scheduler only |

The worker endpoint requires `DISPATCH_WORKER_SECRET` (at least 32 characters) and compares it in constant time. It accepts `{ "tripId": "...", "stage": 0 }`. The trusted scheduler invokes successive stages after each offer window expires. The worker reads available drivers, considers only fresh driver locations (90 seconds), sorts by pickup distance, and sends up to the configured maximum number of offers within that stage's radius. Driver state and trip state are re-read inside a Firestore transaction before offer documents are created. Offer IDs are deterministic per trip and driver to prevent duplicate delivery.

The scheduled sweep reads pending and searching trips, waits for the configured offer TTL between waves, and invokes the internal worker for each due stage. It requires `APP_BASE_URL` (HTTPS deployment origin) and the same server-only `DISPATCH_WORKER_SECRET`. Configure Cloud Scheduler or an equivalent trusted scheduler to POST to `/api/internal/dispatch/sweep` with the `x-dispatch-secret` header at a cadence appropriate for the offer TTL (for example, once per minute with a 60-second TTL). The sweep processes a bounded batch and is safe against overlapping invocations because the worker rejects stale stages transactionally.

The endpoint reads `config/dispatch` with `stageRadiiKm: number[]`, `offerTtlSeconds` (15–300), and `maxOffersPerStage` (1–30). Stage values are zero-based; after the final offer window expires, the scheduler calls the final stage index (`stageRadiiKm.length`) to mark the still-searching trip `no_driver`, unless a live offer remains. If the trip was accepted or otherwise changed, stale dispatch attempts are rejected.

Operational driver records must store `isAvailable`, optional `activeTripId`, `location: { lat, lng }`, and Firestore Timestamp `locationUpdatedAt`. The worker does not obtain GPS itself and does not start a scheduler. The authenticated driver location API is implemented separately; a trusted scheduled job/queue must call the worker at the right intervals.

## Implemented driver location update API

| Method | Route | Purpose | Authorization |
| --- | --- | --- | --- |
| POST | `/api/driver/location` | Update the authenticated driver's current location | Verified approved driver who is online or has an active trip |

The route accepts latitude, longitude, and reported accuracy (maximum 200 metres), stores only the latest location and server timestamp on `drivers/{uid}`, and applies a two-second minimum interval. It does not accept a driver UID from the body. Location updates are rejected while the driver is offline with no active trip. Browser geolocation permission and collection timing must be controlled by the driver UI; do not collect location continuously outside an active work state.

## Proposed API surface

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
