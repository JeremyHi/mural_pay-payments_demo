# Implementation Plan: Open Destiny

## Overview

This document outlines the staged implementation plan for building the Open Destiny fortune cookie storefront with Mural Pay integration.

## Stage 1: Project Setup & Documentation

### Tasks
- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Install dependencies (Drizzle ORM, better-sqlite3, uuid)
- [x] Create documentation folder
- [x] Write PRD.md
- [x] Write arch_design.md
- [x] Write implementation_plan.md
- [ ] Set up SQLite database with Drizzle schema
- [ ] Create environment variables template

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
- [ ] Define product data (8 fortune cookies)
- [ ] Create TypeScript types for products, cart items
- [ ] Build Navbar component with cart icon
- [ ] Create ProductCard component
- [ ] Build HomePage with product grid
- [ ] Implement CartContext for state management
- [ ] Create Cart modal with item list

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
- [ ] Build Checkout modal component
- [ ] Display order total in USDC
- [ ] Show Mural wallet address (fetched from API)
- [ ] Add copy-to-clipboard for wallet address
- [ ] Implement payment status polling
- [ ] Create PaymentStatus component

### Files Created
- `src/components/CheckoutModal.tsx`
- `src/components/PaymentStatus.tsx`

---

## Stage 4: Backend - Mural Pay Integration

### Tasks
- [ ] Create Mural API client utility
- [ ] Implement checkout API route (create order, return wallet)
- [ ] Implement webhook handler for payment detection
- [ ] Set up automatic payout creation on payment
- [ ] Implement payout execution logic
- [ ] Add payment status API route

### Files Created
- `src/lib/mural.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/payment-status/[orderId]/route.ts`
- `src/app/api/webhooks/mural/route.ts`

---

## Stage 5: Merchant Dashboard

### Tasks
- [ ] Create merchant page layout
- [ ] Build payments list component
- [ ] Show payout/withdrawal status
- [ ] Add auto-refresh for status updates
- [ ] Implement withdrawals API route

### Files Created
- `src/app/merchant/page.tsx`
- `src/app/api/merchant/withdrawals/route.ts`

---

## Stage 6: Polish & Testing

### Tasks
- [ ] Add error handling for API calls
- [ ] Implement loading states
- [ ] Add toast notifications
- [ ] Ensure mobile responsiveness
- [ ] Test complete payment flow with sandbox
- [ ] Verify webhook handling
- [ ] Test payout automation

---

## Verification Checklist

### Frontend
- [ ] Products display correctly in grid
- [ ] Add to cart updates count badge
- [ ] Cart modal shows correct items and total
- [ ] Checkout modal displays wallet address
- [ ] Copy button works for wallet address
- [ ] Payment status updates in real-time

### Backend
- [ ] Checkout creates order in database
- [ ] Webhook receives and processes events
- [ ] Payment updates order status
- [ ] Payout is created automatically
- [ ] Payout executes successfully
- [ ] Status API returns correct data

### Integration
- [ ] Full customer flow works end-to-end
- [ ] Merchant dashboard shows all data
- [ ] Webhook signature verification works
- [ ] Error states handled gracefully

---

## Environment Setup

### Required Environment Variables
```env
MURAL_API_KEY=           # Mural Pay API key
MURAL_TRANSFER_API_KEY=  # Mural Pay transfer API key
MURAL_ORGANIZATION_ID=   # Your Mural organization ID
MURAL_ACCOUNT_ID=        # Your Mural account ID
MURAL_COUNTERPARTY_ID=   # Pre-configured COP recipient
MURAL_PAYOUT_METHOD_ID=  # Pre-configured COP bank method
MURAL_API_BASE_URL=https://api-staging.muralpay.com
WEBHOOK_SECRET=          # For webhook verification
DATABASE_URL=file:./data/openDestiny.db
```

### Mural Pay Sandbox Setup
1. Create sandbox account at Mural Pay
2. Obtain API keys from dashboard
3. Create a Mural Account (wallet)
4. Configure counterparty with COP bank details
5. Register webhook URL for notifications

---

## Dependencies

### Runtime
- `next`: ^14.x
- `react`: ^18.x
- `drizzle-orm`: ^0.x
- `better-sqlite3`: ^9.x
- `uuid`: ^9.x

### Development
- `typescript`: ^5.x
- `tailwindcss`: ^3.x
- `drizzle-kit`: ^0.x
- `@types/better-sqlite3`
- `@types/uuid`
