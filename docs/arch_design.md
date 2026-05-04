# Architecture Design Document: Open Destiny

## System Overview

Open Destiny is built as a full-stack Next.js application with integrated Mural Pay payment processing. The system handles customer shopping, USDC payment collection, and automatic COP conversion/withdrawal.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (React) | UI components and pages |
| Styling | Tailwind CSS | Responsive design |
| State | React Context | Cart state management |
| Backend | Next.js API Routes | REST API endpoints |
| Database | Supabase PostgreSQL + Drizzle ORM (via `postgres-js`) | Order/payment persistence |
| Payments | Mural Pay API | USDC collection & COP payout |
| Deployment | Vercel | Hosting and serverless functions |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ HomePage │  │CartModal │  │ Checkout │  │  Merchant    │    │
│  │(Products)│  │          │  │  Modal   │  │  Dashboard   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       └─────────────┴─────────────┴───────────────┘             │
│                          │                                       │
│                 ┌────────┴────────┐                             │
│                 │  CartContext    │                             │
│                 │ (State Manager) │                             │
│                 └────────┬────────┘                             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                      API ROUTES                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │/api/checkout │  │/api/payment- │  │/api/webhooks/mural  │   │
│  │              │  │status/[id]   │  │                     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘   │
│  ┌──────────────┐  ┌────────────────────────┐                   │
│  │/api/merchant │  │/api/check-webhooks     │                   │
│  │/withdrawals  │  │(diagnostic)            │                   │
│  └──────┬───────┘  └────────────┬───────────┘                   │
│         └─────────────────┬─────┘                                │
│                           │                                      │
│                    ┌──────┴──────────┐                          │
│                    │ Supabase        │                          │
│                    │ PostgreSQL      │                          │
│                    └──────┬──────────┘                          │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    MURAL PAY API                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Accounts  │  │  Webhooks  │  │  Payouts   │                │
│  │(Wallet Addr)│  │(Payments) │  │(COP Xfer) │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Payment Flow

```
1. Customer adds items to cart
   └─> CartContext updates state

2. Customer clicks checkout
   └─> POST /api/checkout
       └─> Creates order in Postgres (status: pending)
       └─> Fetches wallet address from Mural (with env-var fallback)
       └─> Returns Mural wallet address + order ID + total USDC

3. Customer sends USDC externally
   └─> Transaction on Polygon Amoy

4. Mural detects transaction
   └─> POST /api/webhooks/mural (MURAL_ACCOUNT_BALANCE_ACTIVITY,
       payload type: account_credited)
       └─> Verifies ECDSA signature (bypassed in staging)
       └─> Matches pending order by amount within ±$0.01
       └─> Inserts payment record (status: confirmed)
       └─> Updates order status to "paid"
       └─> Triggers initiatePayout() (failures do not cascade)

5. Payout executes automatically (inside the same webhook handler)
   └─> Inserts payout record (status: created)
   └─> Sets order status to "payout_initiated"
   └─> createPayoutRequest() via Mural API (uses Bearer MURAL_API_KEY
       plus transfer-api-key header MURAL_TRANSFER_API_KEY)
   └─> executePayoutRequest() with FLEXIBLE rate tolerance
   └─> Updates payout row with Mural ID, status, exchange rate, COP amount

6. Webhook updates on payout status (PAYOUT_REQUEST events)
   └─> POST /api/webhooks/mural
       └─> Re-fetches payout via getPayoutRequest() — API status is
           the source of truth; webhook payload is only a trigger
       └─> Maps Mural status to internal status, including the nested
           fiat payout status when top-level is EXECUTED
       └─> Updates payout record; flips order to "completed" on success
```

## Database Schema

Defined in `src/db/schema.ts` using Drizzle's `pg-core`. Status fields are plain `text` columns, narrowed to string-literal unions in TypeScript (`OrderStatus`, `PaymentStatus`, `PayoutStatus`) — they are not Postgres enum types. Foreign keys cascade on delete.

> Note: Postgres `numeric` columns are returned as JS strings by `postgres-js`. Application code converts with `Number()` for comparisons and `.toString()` on insert.

### Orders Table
```sql
CREATE TABLE orders (
  id              TEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'pending',
  total_usdc      NUMERIC(10, 2) NOT NULL,
  items           TEXT NOT NULL,             -- JSON-encoded cart items
  customer_wallet TEXT                       -- reserved; not currently written
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id                    TEXT PRIMARY KEY,
  order_id              TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mural_transaction_id  TEXT,
  transaction_hash      TEXT,
  amount                NUMERIC(10, 2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
);
```

### Payouts Table
```sql
CREATE TABLE payouts (
  id                       TEXT PRIMARY KEY,
  payment_id               TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mural_payout_request_id  TEXT,
  usdc_amount              NUMERIC(10, 2) NOT NULL,
  cop_amount               NUMERIC(15, 2),
  exchange_rate            NUMERIC(10, 6),
  status                   TEXT NOT NULL DEFAULT 'created'
);
```

### Status state machines
- `OrderStatus`: `pending → paid → payout_initiated → completed` (or `failed`)
- `PaymentStatus`: `pending | confirmed | failed`
- `PayoutStatus`: `created → pending → executed → completed` (or `failed`)

## API Endpoints

### Internal APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkout` | POST | Create order, return wallet address and total USDC |
| `/api/payment-status/[orderId]` | GET | Get order/payment/payout status (polled by checkout UI) |
| `/api/webhooks/mural` | POST | Handle Mural Pay webhook events (`MURAL_ACCOUNT_BALANCE_ACTIVITY`, `PAYOUT_REQUEST`) |
| `/api/merchant/withdrawals` | GET | List all payouts joined with payment/order data |
| `/api/check-webhooks` | GET | Diagnostic; lists Mural-side webhook subscriptions and validates URL/categories |

### Mural Pay Integration Points

| Mural Endpoint | Our Usage | Auth |
|----------------|-----------|------|
| `GET /api/accounts/{id}` | Get wallet address at checkout | Bearer `MURAL_API_KEY` |
| `GET /api/webhooks`, `GET /api/webhooks/{id}` | Diagnostic listing of registered webhooks | Bearer `MURAL_API_KEY` |
| `POST /api/payouts/payout` | Create COP payout request | Bearer `MURAL_API_KEY` **plus** `transfer-api-key: MURAL_TRANSFER_API_KEY` |
| `POST /api/payouts/payout/{id}/execute` | Execute payout (FLEXIBLE rate tolerance) | Bearer `MURAL_API_KEY` **plus** `transfer-api-key: MURAL_TRANSFER_API_KEY` |
| `GET /api/payouts/payout/{id}` | Re-fetch payout state inside webhook handler (source of truth) | Bearer `MURAL_API_KEY` |
| `POST /api/transactions/search/account/{id}` | Search account transactions (helper, not currently called from request paths) | Bearer `MURAL_API_KEY` |

## Component Architecture

### Frontend Components

```
src/
├── app/
│   ├── layout.tsx         # Root layout with Navbar
│   ├── page.tsx           # HomePage with product grid
│   └── merchant/
│       └── page.tsx       # Merchant dashboard
├── components/
│   ├── Navbar.tsx         # Site header with cart icon
│   ├── ProductCard.tsx    # Individual product display
│   ├── CartModal.tsx      # Cart overlay
│   ├── CheckoutModal.tsx  # Payment flow
│   └── PaymentStatus.tsx  # Status display component
├── contexts/
│   └── CartContext.tsx    # Cart state management
└── lib/
    ├── products.ts        # Product data
    ├── types.ts           # TypeScript definitions
    └── mural.ts           # Mural API client
```

### State Management

Cart state managed via React Context (`src/contexts/CartContext.tsx`):
- `items`: Array of cart items (product + quantity)
- `addItem`, `removeItem`, `updateQuantity`, `clearCart`: cart mutations
- `total`, `itemCount`: computed values
- `isCartOpen` / `isCheckoutOpen` (+ setters): modal control

State is held in React memory only — there is no localStorage persistence, so the cart resets on page reload.

## Security Considerations

1. **API Key Protection**: Mural API keys (`MURAL_API_KEY`, `MURAL_TRANSFER_API_KEY`) stored in environment variables, never exposed to client.
2. **Webhook Verification**: ECDSA-SHA256 signature validation against `WEBHOOK_PUBLIC_KEY` over `${timestamp}.${rawBody}`. Note: signature failures are bypassed when `MURAL_API_BASE_URL` contains `staging` to ease sandbox testing — this guard must be removed before any production deployment.
3. **Database Access**: Supabase-managed PostgreSQL accessed via pooled connection string (`DATABASE_URL`); no direct file access from the app server.
4. **Input Validation**: Validate all API inputs before processing.

## Error Handling

1. **Webhook Failures**: Return 200 OK on processing, log errors, rely on Mural retry
2. **Payout Failures**: Mark payout as failed, alert via dashboard
3. **Database Errors**: Transaction rollback, return appropriate HTTP status

## Environment Configuration

```env
# Mural Pay
MURAL_API_KEY=<api-key>
MURAL_TRANSFER_API_KEY=<transfer-api-key>
MURAL_ORGANIZATION_ID=<org-id>
MURAL_ACCOUNT_ID=<account-id>
MURAL_COUNTERPARTY_ID=<counterparty-id>
MURAL_PAYOUT_METHOD_ID=<payout-method-id>
MURAL_API_BASE_URL=https://api-staging.muralpay.com

# Webhook Security
WEBHOOK_SECRET=<webhook-secret>
WEBHOOK_PUBLIC_KEY=<webhook-public-key>   # Used for ECDSA signature verification

# Supabase Postgres
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Optional Supabase client (not required by current code)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
```
