# Implementation Plan: Open Destiny

## Overview

This document outlines the staged implementation plan for building the Open Destiny fortune cookie storefront with Mural Pay integration. All stages below have been completed; this file is retained as a build record.

> **Note on database choice**: the original plan called for SQLite via `better-sqlite3`. During implementation the project switched to Supabase PostgreSQL accessed through `postgres-js` so the deployed app can share state across Vercel's serverless function instances. The checklist below reflects the shipped implementation.

## Stage 1: Project Setup & Documentation

### Tasks
- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Install dependencies (Drizzle ORM, postgres-js, uuid)
- [x] Create documentation folder
- [x] Write PRD.md
- [x] Write arch_design.md
- [x] Write implementation_plan.md
- [x] Set up Supabase PostgreSQL with Drizzle schema
- [x] Create environment variables template

### Files Created
- `docs/PRD.md`
- `docs/arch_design.md`
- `docs/implementation_plan.md`
- `db/schema.ts`
- `db/index.ts`
- `.env.example`

---

## Stage 2: Frontend - Product Catalog & Cart

### Tasks
- [x] Define product data (8 fortune cookies)
- [x] Create TypeScript types for products, cart items
- [x] Build Navbar component with cart icon
- [x] Create ProductCard component
- [x] Build HomePage with product grid
- [x] Implement CartContext for state management (in-memory only; no localStorage persistence)
- [x] Create Cart modal with item list

### Files Created
- `src/lib/products.ts`
- `src/lib/types.ts`
- `src/components/Navbar.tsx`
- `src/components/ProductCard.tsx`
- `src/components/CartModal.tsx`
- `src/contexts/CartContext.tsx`
- Update `src/app/layout.tsx`
- Update `src/app/page.tsx`

---

## Stage 3: Frontend - Checkout Flow

### Tasks
- [x] Build Checkout modal component
- [x] Display order total in USDC
- [x] Show Mural wallet address (fetched from API)
- [x] Add copy-to-clipboard for wallet address
- [x] Implement payment status polling (5s interval against `/api/payment-status/[orderId]`)
- [x] Create PaymentStatus component

### Files Created
- `src/components/CheckoutModal.tsx`
- `src/components/PaymentStatus.tsx`

---

## Stage 4: Backend - Mural Pay Integration

### Tasks
- [x] Create Mural API client utility (fetch-based; supports dual-key auth — Bearer `MURAL_API_KEY` plus `transfer-api-key` header for create/execute payout)
- [x] Implement checkout API route (create order, return wallet)
- [x] Implement webhook handler for payment detection (`MURAL_ACCOUNT_BALANCE_ACTIVITY`)
- [x] Set up automatic payout creation on payment
- [x] Implement payout execution logic
- [x] Add payment status API route
- [x] Implement ECDSA webhook signature verification against `WEBHOOK_PUBLIC_KEY`
- [x] Use Mural API as source of truth for `PAYOUT_REQUEST` status (re-fetch payout on every webhook)

### Files Created
- `src/lib/mural.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/payment-status/[orderId]/route.ts`
- `src/app/api/webhooks/mural/route.ts`
- `src/app/api/check-webhooks/route.ts` (diagnostic for verifying registered Mural webhooks)

---

## Stage 5: Merchant Dashboard

### Tasks
- [x] Create merchant page layout
- [x] Build payments list component
- [x] Show payout/withdrawal status
- [x] Add auto-refresh for status updates (10s polling)
- [x] Implement withdrawals API route

### Files Created
- `src/app/merchant/page.tsx`
- `src/app/api/merchant/withdrawals/route.ts`

---

## Stage 6: Polish & Testing

### Tasks
- [x] Add error handling for API calls
- [x] Implement loading states
- [x] Ensure mobile responsiveness
- [x] Test complete payment flow with sandbox
- [x] Verify webhook handling
- [x] Test payout automation
- [ ] Add toast notifications (deferred; status surfaces via inline `PaymentStatus` and merchant dashboard)

---

## Verification Checklist

### Frontend
- [x] Products display correctly in grid
- [x] Add to cart updates count badge
- [x] Cart modal shows correct items and total
- [x] Checkout modal displays wallet address
- [x] Copy button works for wallet address
- [x] Payment status updates in real-time (via 5s polling)

### Backend
- [x] Checkout creates order in database
- [x] Webhook receives and processes events
- [x] Payment updates order status
- [x] Payout is created automatically
- [x] Payout executes successfully
- [x] Status API returns correct data

### Integration
- [x] Full customer flow works end-to-end
- [x] Merchant dashboard shows all data
- [x] Webhook signature verification works (bypassed in staging; see arch_design.md)
- [x] Error states handled gracefully (payout failures don't cascade onto payment success)

---

## Environment Setup

### Required Environment Variables
```env
MURAL_API_KEY=           # Bearer token for most Mural endpoints
MURAL_TRANSFER_API_KEY=  # Sent as `transfer-api-key` header on payout create/execute
MURAL_ORGANIZATION_ID=   # Your Mural organization ID
MURAL_ACCOUNT_ID=        # Your Mural account ID (provides the deposit wallet)
MURAL_COUNTERPARTY_ID=   # Pre-configured COP recipient
MURAL_PAYOUT_METHOD_ID=  # Pre-configured COP bank method
MURAL_API_BASE_URL=https://api-staging.muralpay.com

WEBHOOK_SECRET=          # Reserved for future shared-secret verification
WEBHOOK_PUBLIC_KEY=      # ECDSA public key used to verify webhook signatures

DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Optional Supabase client credentials (not required by current code)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=
```

### Mural Pay Sandbox Setup
1. Create sandbox account at Mural Pay
2. Obtain API keys from dashboard
3. Create a Mural Account (wallet)
4. Configure counterparty with COP bank details
5. Register webhook URL for notifications

---

## Dependencies

(Versions reflect what is actually installed; see `package.json` for the source of truth.)

### Runtime
- `next`: 14.2.35
- `react` / `react-dom`: ^18
- `drizzle-orm`: ^0.45.1
- `postgres`: ^3.4.3 (postgres-js client)
- `@supabase/supabase-js`: ^2.39.0 (installed; not used by current request paths)
- `uuid`: ^13.0.0

### Development
- `typescript`: ^5
- `tailwindcss`: ^3.4.1
- `postcss`: ^8
- `drizzle-kit`: ^0.31.8
- `eslint` + `eslint-config-next`
- `@types/node`, `@types/react`, `@types/react-dom`, `@types/uuid`
