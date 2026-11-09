# Customer–Driver Fare Negotiation

Status: design approved; implementation not yet enabled.

## Product decision

Capital Taxi will support an original, inDrive-inspired fare negotiation flow. This is a product behavior reference only; Capital Taxi keeps its own brand, visual assets, copy, and interaction design.

The customer proposes a fare when requesting a trip. Eligible nearby drivers can submit a counteroffer. The customer reviews the offers and selects exactly one. The selected offer becomes the agreed fare and assigns that driver atomically. The existing fixed-tariff estimate remains visible as a reference, not as the final agreed fare.

## Non-negotiable invariants

1. Only an authenticated customer who owns a trip may read its bids or select a bid.
2. Only an authenticated, approved, available driver with a fresh location and a live dispatch offer for that trip may submit or revise one bid.
3. The server computes and enforces the permitted fare floor and ceiling from the active admin pricing configuration. Client-supplied limits are never trusted.
4. A bid is tied to one trip and one driver; a driver cannot create duplicate competing bid records for the same trip.
5. Bids expire. Expired, withdrawn, rejected, or already selected bids cannot be selected.
6. Selecting a bid is a Firestore transaction that re-reads the trip, bid, driver, approval, availability, and dispatch offer; assigns one driver, writes the agreed fare, withdraws competing dispatch offers and bids, and appends a status timeline event.
7. A transaction race has exactly one winner. Every losing selection returns a conflict and cannot overwrite the winner.
8. No client has direct Firestore access to bid or trip assignment documents. All operations go through authenticated server routes.
9. Existing trip documents remain readable. Legacy trips without negotiation fields continue using their existing fixed-fare flow.
10. No production Firestore data, rules, indexes, or deployment is changed as part of this design note.

## Proposed Firestore shape

Keep the existing `trips` and `tripOffers` collections.

Add optional fields to new trip documents:
- `fareMode: "negotiable"`
- `customerProposedFare: number`
- `fareFloor: number` (server-derived snapshot from active pricing)
- `fareCeiling: number` (server-derived snapshot from active pricing)
- `agreedFare: number | null`
- `selectedBidId: string | null`

Add `tripBids/{tripId}_{driverUid}`:
- `tripId`, `driverUid`
- `amount` (integer EGP)
- `status: "active" | "selected" | "withdrawn" | "expired"`
- `createdAt`, `updatedAt`, `expiresAt`
- optional bounded `message` (plain text only; no contact details)

The deterministic document ID enforces one active bid per driver per trip. Updating a bid must preserve the original creation timestamp and remain within server limits.

## API contract

- `POST /api/trips`: accept `customerProposedFare` for new negotiable requests; compute distance and fare bounds server-side; validate the proposal; create trip with `fareMode`; preserve existing idempotency behavior.
- `GET /api/customer/trips/[tripId]/bids`: customer-owner only; return active bids with safe driver display fields, amount, and expiry. Never return private driver account data.
- `POST /api/trips/[tripId]/bids`: approved driver only; require a current unexpired `tripOffers` dispatch record and availability; create/update that driver's bid transactionally.
- `POST /api/trips/[tripId]/select-bid`: customer-owner only; accept `bidId`; atomically select and assign.
- Existing driver `/accept` must not directly assign negotiable trips. It remains compatible only for legacy fixed-fare trips until the migration window closes.
- Driver offer feed should show the customer's proposed fare and the server-computed permitted range; the driver submits a counteroffer rather than instantly accepting.

## Pricing policy

The admin pricing document remains authoritative. Before enabling negotiation, the admin workspace must expose and validate:
- negotiation enabled/disabled;
- minimum permitted fare or floor policy;
- maximum permitted fare or ceiling policy;
- optional rounding increment;
- optional bid expiry duration.

The server snapshots the effective floor and ceiling into each new trip so later admin changes do not silently change an in-progress negotiation. If the pricing document does not explicitly enable and configure negotiation, the server rejects negotiable requests rather than guessing limits.

## Customer experience

- Enter pickup, destination, vehicle class, and proposed fare.
- Show the tariff estimate and permitted negotiation range before submission.
- Show incoming driver bids with fare, vehicle summary, and expiry countdown.
- Allow the customer to select one bid. Show the agreed fare and assigned driver only after the server confirms the transaction.
- Poll with bounded cadence initially; move to a realtime transport only after authorization and load tests.

## Driver experience

- Receive nearby trip requests through the existing staged dispatch system.
- See pickup, destination, proposed fare, estimated distance, and allowed range.
- Submit or revise one counteroffer before expiry.
- See clear states: submitted, updated, selected, expired, withdrawn.
- Do not show customer contact details until the bid is selected and the trip is assigned.

## Rollout sequence

1. Add domain validation and transaction tests using the Firestore emulator.
2. Add bid creation/read/select server routes; test auth, ownership, expiry, bounds, replay, and concurrent selection.
3. Extend trip creation with a server-derived pricing snapshot and explicit negotiation opt-in.
4. Update driver and customer interfaces to consume the real APIs.
5. Extend admin pricing UI and audit logging.
6. Run lint, typecheck, unit tests, Firestore emulator rules/lifecycle tests, and production build.
7. Deploy only to a protected preview and run an end-to-end test with test accounts.
8. Enable negotiation in production only after explicit owner approval and a verified rollback plan.

## Not included in this first rollout

Wallet settlement, card/e-wallet collection, in-app chat/calling, automated dynamic surge pricing, and any change to existing customer or driver records. These require separate designs and security review.
