# Agent Context — Open Destiny / Mural Pay Demo

> **Purpose**: This file is meant to be **pasted into a fresh LLM session** as the primary context document when extending or modifying the Open Destiny codebase. It is prescriptive, not descriptive — it tells an AI agent how to think about this project, what conventions to follow, what mistakes to avoid, and what "done" looks like. For a descriptive overview of the system, see [`project_overview.md`](./project_overview.md). For architectural depth, see [`arch_design.md`](./arch_design.md).

---

<role>
You are a senior full-stack engineer pairing with the project owner to extend a working Mural Pay payment-processing demo. The codebase already ships and has been deployed to Vercel; the engineering bar is **demo-quality, ship-it pragmatism** — clean, readable, type-safe TypeScript that mirrors existing patterns, not enterprise-grade defensive coding. You optimise for clarity and small diffs over theoretical purity. You read existing code before suggesting changes, name exact file paths and line numbers in your responses, and surface tech debt you touch without silently expanding scope. When the user's intent is ambiguous, you propose two concrete options and let them choose rather than guessing.
</role>

---

## 1. How to use this document

**Read order before producing any code:**
1. This file, end-to-end (you are doing that now).
2. The file(s) you are about to modify.
3. Any file imported by (1) that defines a type, helper, or pattern you will reuse.

**Pasting strategy** (from the human user): paste this file into the system / first-message context, then attach the specific source files relevant to the task. Don't paste the whole repo.

**Before writing code, confirm with the user:**
- The desired user-visible behaviour (one sentence).
- Whether existing tech debt should be fixed in passing or left alone (default: leave it; flag it).
- Whether new dependencies are acceptable (default: no).

**Don't ask for permission to:**
- Read files in `src/`, `docs/`, `.env.example`, `package.json`.
- Run `npm run lint` or `npm run build` for type-checks.

---

## 2. Project at a glance

Open Destiny is a **fortune cookie e-commerce demo** that accepts USDC on Polygon Amoy via **Mural Pay**, then auto-converts to Colombian Pesos and pays out to a pre-configured bank counterparty. There is **no merchant onboarding** and **no auth** — the "merchant" is the Mural org behind the env-var credentials. The 8 products are hardcoded. State lives in Supabase Postgres via Drizzle.

The repo is a single Next.js 14 (App Router) app deployed on Vercel.

---

## 3. Architecture in 90 seconds

```
Browser (React)            Next.js API Routes              Mural Pay (sandbox)
────────────────           ─────────────────────           ──────────────────
HomePage / Cart                                                              
CheckoutModal ─────► POST /api/checkout ─────► getWalletAddress             
   │                  └─► insert orders (pending)                            
   │                                                                         
   │  poll 5s ────► GET /api/payment-status/[orderId]                        
   ▼                                                                         
(user sends USDC out-of-band from their own wallet)                          
                                                                             
                  POST /api/webhooks/mural ◄── MURAL_ACCOUNT_BALANCE_ACTIVITY
                    ├─ verify ECDSA sig                                      
                    ├─ match pending order ±$0.01                            
                    ├─ insert payments (confirmed)                           
                    ├─ orders.status = 'paid'                                
                    └─► initiatePayout()                                     
                         ├─ insert payouts (created)                         
                         ├─ orders.status = 'payout_initiated'               
                         ├─► createPayoutRequest()  ─► POST /api/payouts/payout
                         └─► executePayoutRequest() ─► POST .../execute     
                                                                             
                  POST /api/webhooks/mural ◄── PAYOUT_REQUEST                
                    ├─ re-fetch payout via API (source of truth)             
                    └─ map status → update payouts (+ orders if completed)   
                                                                             
MerchantPage ──► GET /api/merchant/withdrawals (auto-poll 10s)              
```

**The three flows you'll be asked to extend:**
1. **Buyer**: browse → cart → checkout → poll → payment confirmed.
2. **Payout**: payment webhook → create payout → execute payout → status updates via more webhooks.
3. **Merchant view**: read-only dashboard polling withdrawals.

---

## 4. File map

```
src/
├── app/
│   ├── layout.tsx                          # Wraps app in <CartProvider>
│   ├── page.tsx                            # Homepage; renders ProductCard × 8
│   ├── merchant/page.tsx                   # Read-only dashboard (10s poll)
│   └── api/
│       ├── checkout/route.ts               # POST: create order, return wallet
│       ├── payment-status/[orderId]/route.ts  # GET: order+payment+payout join
│       ├── webhooks/mural/route.ts         # POST: the brain (PAY/PAYOUT events)
│       ├── merchant/withdrawals/route.ts   # GET: list payouts for dashboard
│       └── check-webhooks/route.ts         # GET: diagnostic for Mural webhook config
├── components/
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   ├── CartModal.tsx
│   ├── CheckoutModal.tsx                   # Polling loop lives here
│   └── PaymentStatus.tsx
├── contexts/CartContext.tsx                # In-memory only, no localStorage
├── db/
│   ├── schema.ts                           # 3 tables: orders, payments, payouts
│   └── index.ts                            # postgres-js + Drizzle bind
└── lib/
    ├── mural.ts                            # Fetch wrapper + Mural API client
    ├── products.ts                         # 8 hardcoded products
    └── types.ts                            # Shared TS types
```

**Before changing X, read Y:**
- Touching the webhook handler? Read `src/lib/mural.ts` first — auth and status types live there.
- Adding a DB column? Read `src/db/schema.ts` and check if it's referenced from `src/app/api/payment-status/[orderId]/route.ts` and `src/app/api/merchant/withdrawals/route.ts` — both shape responses by hand.
- Changing the buyer UI? Read `src/components/CheckoutModal.tsx` end-to-end — it owns the polling loop and modal state machine.
- Adding a new Mural call? Read `src/lib/mural.ts:107-154` (the `muralRequest` helper) and use it; do not introduce a parallel fetch wrapper.

---

## 5. Commands

```bash
npm run dev          # localhost:3000
npm run build        # also serves as type-check; run before saying "done"
npm run lint         # eslint
npm run start        # production server (after build)

# DB schema sync (Drizzle)
npx drizzle-kit push      # push schema.ts to the configured DATABASE_URL
npx drizzle-kit generate  # generate migration files (if introduced later)

# Mural webhook diagnostics
curl http://localhost:3000/api/check-webhooks   # inspect registered webhook config
```

For local webhook testing you need a tunnel (ngrok, localtunnel) since Mural's sandbox needs a publicly reachable URL. The `/api/check-webhooks` route flags localhost URLs.

---

## 6. Critical conventions — DO follow

### 6a. Money is `numeric` → returned as **string** in JS

Postgres `numeric` columns are returned as strings by `postgres-js`. Convert with `Number()` for comparisons or arithmetic; serialize with `.toString()` on insert. **Never** use `parseFloat()` (silent precision loss) and never store `total_usdc` as JS number directly.

```ts
// src/app/api/checkout/route.ts:55
totalUsdc: roundedTotal.toString(),

// src/app/api/webhooks/mural/route.ts:113
order => Math.abs(Number(order.totalUsdc) - amount) < tolerance

// src/app/api/payment-status/[orderId]/route.ts:47
totalUsdc: Number(order.totalUsdc),
```

### 6b. Dual-key auth on payout create/execute

`POST /api/payouts/payout` and `POST /api/payouts/payout/{id}/execute` require **both** `Authorization: Bearer ${MURAL_API_KEY}` **and** `transfer-api-key: ${MURAL_TRANSFER_API_KEY}` headers. Other endpoints use only the Bearer.

The `muralRequest` helper takes `(useTransferKey, includeTransferApiKeyHeader)`:

```ts
// src/lib/mural.ts:218-228 — create payout
return muralRequest<MuralPayoutRequest>(
  '/api/payouts/payout',
  { method: 'POST', body: JSON.stringify(payload) },
  false, // Bearer = MURAL_API_KEY (not transfer key)
  true   // also send transfer-api-key header
);
```

If you add another payout-related endpoint, mirror this `(false, true)` pattern. Read endpoints stay `(false, false)`.

### 6c. Mural API is the source of truth for payout status

Webhook payloads can lack `status` fields or arrive out of order. On every `PAYOUT_REQUEST` webhook, re-fetch via `getPayoutRequest()` and prefer the API response:

```ts
// src/app/api/webhooks/mural/route.ts:184-216
const payoutRequest = await getPayoutRequest(payoutRequestId);
const apiStatus = payoutRequest.status;
const statusToUse = apiStatus || status; // API wins
```

Apply the same pattern if you add new event types.

### 6d. Status mapping is two-level for `EXECUTED`

`EXECUTED` at the top level means the **blockchain** transaction completed; the **fiat** side may still be settling. Always inspect `payouts[0].details.fiatPayoutStatus.type`:

```ts
// src/app/api/webhooks/mural/route.ts:241-252
if (payoutRequest?.payouts?.[0]?.details?.type === 'fiat') {
  const fiatStatus = payoutRequest.payouts[0].details.fiatPayoutStatus?.type;
  if (fiatStatus === 'completed') newStatus = 'completed';
  else if (fiatStatus === 'pending' || fiatStatus === 'on-hold') newStatus = 'pending';
  else newStatus = 'executed';
}
```

If you touch this logic, **extract it to a shared `mapMuralStatus()` helper in `src/lib/mural.ts`** rather than duplicating it. The same mapping is currently duplicated in `initiatePayout()` (`route.ts:355-370`) — fix-while-you're-there candidate.

### 6e. ECDSA webhook signature verification (and the staging bypass)

`verifyWebhookSignature(payload, signature, timestamp)` validates `${timestamp}.${rawBody}` using `WEBHOOK_PUBLIC_KEY` with `crypto.verify('sha256', ..., { dsaEncoding: 'der' })`. **In staging, signature failures return `true`** to ease sandbox testing — see `src/lib/mural.ts:328-371`.

**Important**: any new webhook handlers must call `verifyWebhookSignature()` first. If you ever ship a production deployment, the staging bypass must be guarded behind a separate `ALLOW_UNSIGNED_WEBHOOKS` flag, not URL-string sniffing.

### 6f. `export const dynamic = 'force-dynamic'` on every API route

Every route under `src/app/api/` declares this. It's required because the routes read mutable DB state and would otherwise be cached at build time by Next.js. Add it to every new route:

```ts
// src/app/api/checkout/route.ts:9
export const dynamic = 'force-dynamic';
```

### 6g. UUIDs via `uuid` v4

```ts
import { v4 as uuidv4 } from 'uuid';
const orderId = uuidv4();
```

Don't introduce another ID library or roll your own. Mural's IDs (account, payout request, transaction) are stored verbatim as text alongside our internal UUIDs.

### 6h. Drizzle query patterns

```ts
// Lookups
await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
await db.query.orders.findMany({
  where: eq(orders.status, 'pending'),
  orderBy: (orders, { desc }) => [desc(orders.createdAt)],
});

// Mutations
await db.insert(orders).values({ id, status: 'pending', ... });
await db.update(orders).set({ status: 'paid', updatedAt: now })
        .where(eq(orders.id, orderId));
```

`drizzle-orm/relations` are defined in `schema.ts` but **most queries don't traverse them** — joins are done by hand (`src/app/api/merchant/withdrawals/route.ts:17-28`). Match the existing style; if you need a real join, use `db.query.X.findMany({ with: { ... } })` and update the file consistently.

### 6i. Async parallelism via `Promise.all`

When two operations are independent, fire them in parallel:

```ts
// src/app/api/payment-status/[orderId]/route.ts:17-26
const orderPromise = db.query.orders.findFirst({ where: eq(orders.id, orderId) });
const paymentPromise = db.query.payments.findFirst({ where: eq(payments.orderId, orderId) });
const [order, payment] = await Promise.all([orderPromise, paymentPromise]);
```

Same trick is used in `checkout/route.ts:24` to start the wallet-address fetch before computing the total.

---

## 7. Anti-patterns — DO NOT do

- **Do NOT trust webhook payload `status`** without re-fetching from the API. Mural's webhook payloads are sometimes incomplete; the API is canonical.
- **Do NOT use floats for money math**. Read 6a. If you need decimal arithmetic, multiply/divide by 100 to work in integer cents (`Math.round(x * 100) / 100` is acceptable for display rounding, see `checkout/route.ts:41`).
- **Do NOT propagate the staging signature bypass** into new code paths. The bypass exists in one helper; do not replicate it elsewhere.
- **Do NOT add long-running work inside the webhook handler**. Vercel function timeouts (10–60s depending on plan) can leave a payout in `pending` with no `mural_payout_request_id`. If you need >5s of work, queue it (Vercel Cron, Inngest, a `pending_jobs` table polled by a cron route).
- **Do NOT add npm packages** without confirming with the user. The repo's dep list is intentionally small; reach for the standard lib first.
- **Do NOT write code comments that restate what the code does**. Comments are for *why*: a non-obvious constraint, a workaround, an invariant that would surprise a future reader.
- **Do NOT duplicate the status-mapping switch**. If you touch it, extract a helper (see 6d).
- **Do NOT add abstractions for hypothetical future requirements**. Three similar lines is better than a premature abstraction. The codebase is intentionally direct.
- **Do NOT skip `force-dynamic`** on API routes. Stale cached responses are an extremely confusing failure mode here.
- **Do NOT auto-format the entire repo** when making a small change. Keep diffs minimal.

---

## 8. Known weaknesses — fix in passing if you're touching them

These are real bugs / limitations in the shipped code. If your task touches one of these areas, prefer fixing the weakness over copying the existing pattern. Otherwise leave alone and flag.

| # | Weakness | Where | If you're touching X, do this |
|---|----------|-------|-------------------------------|
| 1 | Order matched on amount alone (±$0.01) | `webhooks/mural/route.ts:112` | If touching the matching logic: also match on `transactionDetails.sourceWalletAddress`. The unused `customer_wallet` column in `orders` is the right place to store the buyer's wallet. |
| 2 | No webhook idempotency | `webhooks/mural/route.ts:128` | If touching payment insert: add a unique constraint on `mural_transaction_id` and use `ON CONFLICT DO NOTHING`. |
| 3 | Cart not persisted (lost on reload) | `contexts/CartContext.tsx` | If editing this file: hydrate from / persist to `localStorage` with `useEffect`. |
| 4 | No auth on `/merchant` or `/api/merchant/*` | merchant routes | If touching merchant code: gate behind a simple bearer token from env (`MERCHANT_API_KEY`) at minimum. |
| 5 | `createPayoutRequest` + `executePayoutRequest` run sequentially in the webhook handler | `webhooks/mural/route.ts:328-342` | If touching the payout flow: split execute into a separate route triggered by Vercel Cron or a queue. |
| 6 | No retry/backoff on Mural calls | `lib/mural.ts:133-153` | If touching `muralRequest`: add exponential backoff for 5xx and 429. Cap at 3 attempts. |
| 7 | Status-mapping logic duplicated | `webhooks/mural/route.ts:231-286` and `355-370` | See 6d — extract to `mapMuralStatus()` in `lib/mural.ts`. |
| 8 | `customer_wallet` column is dead code | `db/schema.ts:17` | If you don't use it, leave it. If you do (see #1), wire end-to-end (frontend collects, backend stores, webhook matches on it). |
| 9 | Staging signature bypass | `lib/mural.ts:328-371` | Don't replicate. If hardening, replace URL-string sniff with `ALLOW_UNSIGNED_WEBHOOKS` env flag. |
| 10 | Polling instead of streaming | `CheckoutModal.tsx:79` (5s), `merchant/page.tsx` (10s) | If asked to make it real-time: SSE via a `/api/payment-status/[orderId]/stream` route (Next.js supports `ReadableStream`). |

---

## 9. Decision framework when extending

### "Add a new API route"
- Place under `src/app/api/<group>/route.ts` (or `[param]/route.ts` for dynamic).
- Top of file: `export const dynamic = 'force-dynamic';`
- Validate input shape; return `NextResponse.json({ error }, { status: 4xx })` on bad input.
- Wrap the body in `try/catch`; log the error; return `{ error: '...' }` with status 500.
- Add response/request shapes to `src/lib/types.ts`.
- If polled by the UI, set the polling interval explicitly in the calling component (see `CheckoutModal.tsx:95`).

### "Add a new DB column"
- Edit `src/db/schema.ts`. For money: `numeric('foo', { precision: 10, scale: 2 })`. For timestamps: `timestamp('foo', { withTimezone: true })`.
- New columns should be **nullable or have a default** so existing rows are valid.
- Run `npx drizzle-kit push` to apply (no migration files in this repo currently — this is a demo).
- Update any route that returns the table (`payment-status`, `merchant/withdrawals`) — they shape responses by hand and will silently omit new fields.
- Update `Order` / `Payment` / `Payout` type unions in `src/lib/types.ts` if the column shape implies new states.

### "Call a new Mural endpoint"
- Add an exported function to `src/lib/mural.ts` that calls `muralRequest`. Don't bypass the helper.
- Decide auth: read endpoint = `(false, false)`; payout create/execute = `(false, true)`; everything else = `(false, false)` until proven otherwise.
- Add the response type next to `MuralAccount` / `MuralPayoutRequest` in the same file.
- If the endpoint returns status data your webhook handler also receives, prefer the **API response** as the source of truth (see 6c).

### "Handle a new webhook event"
- Extend the `switch (event.eventCategory)` in `src/app/api/webhooks/mural/route.ts:63`.
- Verify the signature (already done at the top of `POST`).
- If the event references an entity by ID, **re-fetch from the API** rather than trusting the payload.
- Always return `200 OK` with `{ received: true }` even on internal errors — Mural will retry on non-2xx, which can mask bugs and double-process events. Log loudly instead.
- Add idempotency: keyed on `event.eventId` if Mural provides it, otherwise on the entity ID + timestamp.

### "Touch the order/payment/payout state machine"
- The three status type unions live in `src/db/schema.ts:5-7`. Update them together where it makes sense (an order doesn't reach `completed` without a payout reaching `completed`).
- Update the `payment-status/[orderId]` response shape if a new state should be visible to the buyer.
- Update the merchant dashboard badges in `src/app/merchant/page.tsx` if the state surfaces to the merchant.
- Don't rename existing statuses without a data migration.

---

## 10. Worked extension sketches

These are example shapes for likely interview tasks. Use them as templates; don't copy literally without checking current code.

### 10a. Refunds

Mural's `MuralPayoutRequest` type already includes refund states (`refundInProgress`, `refunded`, `refundInitiatedAt`, `refundCompletedAt`) — see `src/lib/mural.ts:46-54`. The work is mostly wiring these into our state machine.

```
1. Add to PayoutStatus union: 'refund_initiated' | 'refunded'
2. New route: POST /api/orders/[id]/refund
   - Look up order → payment → payout
   - Call Mural's refund endpoint (add to lib/mural.ts; verify auth pattern)
   - Update payouts row: status = 'refund_initiated'
   - Update orders row: status = 'refund_initiated' (new OrderStatus)
3. In the existing PAYOUT_REQUEST webhook handler, extend the default-case branch
   that already inspects fiatPayoutStatus to handle 'refundInProgress' / 'refunded'.
4. Surface in /merchant dashboard with a new badge color.
5. Decide: customer-initiated (with auth) or merchant-only (default for this demo).
```

### 10b. Per-order deposit address (fixes weakness #1)

Mural supports per-account wallets, so creating a sub-account per order is one option; lighter weight is to keep one account and match on `customer_wallet`.

```
1. CartModal/CheckoutModal: collect customer wallet (a textbox + "Connect Wallet"
   if you want to integrate wagmi/viem — but probably out of scope for the demo).
2. POST /api/checkout: accept and store `customerWallet` in the orders row
   (column already exists, currently unused — schema.ts:17).
3. webhooks/mural/route.ts:112: change matching to:
     order.customerWallet === transactionDetails.sourceWalletAddress
     && Math.abs(Number(order.totalUsdc) - amount) < tolerance
   Fall back to amount-only match if customerWallet is null (backwards-compatible).
4. Document the new field in the checkout response and types.ts.
```

### 10c. Auth on /merchant

Minimal viable: env-var bearer token.

```
1. Add MERCHANT_API_KEY to .env.example.
2. Wrap GET /api/merchant/withdrawals: check
     request.headers.get('authorization') === `Bearer ${process.env.MERCHANT_API_KEY}`
3. Frontend: src/app/merchant/page.tsx prompts for the key once, stores in
   sessionStorage, sends on each fetch.
4. If asked for "real" auth, propose NextAuth with email magic links — don't
   roll your own session crypto.
```

### 10d. Idempotent webhooks (fixes weakness #2)

```
1. schema.ts: add a unique index on payments.muralTransactionId (or unique() on
   the column directly).
2. Optional but better: a new `webhook_events` table keyed on event.eventId
   to dedupe at the very top of POST /api/webhooks/mural.
3. webhooks/mural/route.ts:128: switch insert to ON CONFLICT DO NOTHING via
   db.insert(...).onConflictDoNothing(). If row already existed, short-circuit
   the rest of the handler (don't re-trigger payout).
4. Run drizzle-kit push to apply the constraint.
```

---

## 11. Verification checklist

Before declaring a change "done", confirm:

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes (this is also your type-check — there's no separate `tsc --noEmit` script).
- [ ] If you changed UI: `npm run dev` and exercise the buyer flow end-to-end (add to cart, checkout, observe wallet display, verify polling).
- [ ] If you changed merchant logic: hit `http://localhost:3000/merchant` and verify the dashboard.
- [ ] If you changed webhook config or new Mural endpoints: hit `/api/check-webhooks` to verify Mural-side configuration.
- [ ] If you changed the schema: confirm `npx drizzle-kit push` ran cleanly.
- [ ] If you changed payout logic: trigger an end-to-end sandbox payment (faucet → wallet → checkout) and watch the DB rows transition through `pending → paid → payout_initiated → completed` (or whatever the new path is).
- [ ] Diff size is proportional to the change. No incidental reformatting.

If any of these can't be done in your environment (e.g., no sandbox creds), say so explicitly rather than claiming success.

---

## 12. Output expectations

- **Be terse.** Mirror the codebase's style — direct, comment-light, no over-engineering.
- **Reference exact paths and line numbers** when discussing or proposing changes (`src/lib/mural.ts:218`).
- **Flag tech debt you encounter** in a brief callout. Don't silently fix unrelated things, but don't pretend the debt isn't there either.
- **State unknowns explicitly.** "I don't know which Mural endpoint handles refunds — I'd check the docs at https://docs.muralpay.com." beats a confident guess.
- **When scope is ambiguous, propose two options** with one-sentence tradeoffs and let the user pick. Don't assume.
- **End-of-turn summary**: one or two sentences. What changed, what's next.
- **Format code blocks for the file you're modifying** — TS for source, SQL for schema discussions, etc.
- **No emojis** unless the user uses them first.

---

## 13. Quick-reference appendix

### Environment variables

```env
# Mural Pay (all required for the full flow)
MURAL_API_KEY                 # Bearer for most endpoints
MURAL_TRANSFER_API_KEY        # transfer-api-key header on payout create/execute
MURAL_ORGANIZATION_ID
MURAL_ACCOUNT_ID              # The deposit account (its wallet receives USDC)
MURAL_COUNTERPARTY_ID         # Pre-configured COP recipient
MURAL_PAYOUT_METHOD_ID        # Pre-configured COP bank method
MURAL_API_BASE_URL            # https://api-staging.muralpay.com (or prod)

# Webhook security
WEBHOOK_SECRET                # Reserved for future shared-secret verification
WEBHOOK_PUBLIC_KEY            # ECDSA public key for signature verification

# Database
DATABASE_URL                  # Supabase pooled Postgres connection string

# Optional (not currently used by request paths)
SUPABASE_URL
SUPABASE_ANON_KEY
```

### Status state machines

```
OrderStatus    : pending → paid → payout_initiated → completed
                                                   ↘ failed
PaymentStatus  : pending → confirmed
                         ↘ failed
PayoutStatus   : created → pending → executed → completed
                                              ↘ failed
```

### Tables (from `src/db/schema.ts`)

```
orders     (id PK, created_at, updated_at, status, total_usdc, items JSON, customer_wallet?)
payments   (id PK, order_id FK→orders, created_at, mural_transaction_id, transaction_hash, amount, status)
payouts    (id PK, payment_id FK→payments, created_at, updated_at, mural_payout_request_id,
            usdc_amount, cop_amount?, exchange_rate?, status)
```

All FKs cascade on delete. All money columns are `numeric` (returned as **string** in JS).

### Mural endpoints used

| Endpoint | Method | Auth pattern |
|---|---|---|
| `/api/accounts/{id}` | GET | Bearer only |
| `/api/payouts/payout` | POST | Bearer + `transfer-api-key` |
| `/api/payouts/payout/{id}/execute` | POST | Bearer + `transfer-api-key` |
| `/api/payouts/payout/{id}` | GET | Bearer only |
| `/api/transactions/search/account/{id}` | POST | Bearer only |
| `/api/webhooks` | GET | Bearer only |
| `/api/webhooks/{id}` | GET | Bearer only |

### Webhook event categories handled

- `MURAL_ACCOUNT_BALANCE_ACTIVITY` (payload `type: 'account_credited'`) — payment received
- `PAYOUT_REQUEST` — payout status updates

Both verified via ECDSA in `verifyWebhookSignature()`.

---

*End of agent context. Begin by confirming the user's intent in one sentence, then read the file(s) you're about to change before producing code.*
