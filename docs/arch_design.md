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
| Database | SQLite + Drizzle ORM | Order/payment persistence |
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
│         └─────────────────┼─────────────────────┘               │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │   SQLite    │                              │
│                    │  Database   │                              │
│                    └──────┬──────┘                              │
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
       └─> Creates order in SQLite (status: pending)
       └─> Returns Mural wallet address + order ID

3. Customer sends USDC externally
   └─> Transaction on Polygon Amoy

4. Mural detects transaction
   └─> POST /api/webhooks/mural (account_credited event)
       └─> Creates payment record in SQLite
       └─> Updates order status to "paid"
       └─> Triggers payout creation

5. Payout executes automatically
   └─> Creates payout via Mural API
   └─> Executes payout
   └─> Updates payout status in SQLite

6. Webhook updates on payout status
   └─> POST /api/webhooks/mural (payout events)
       └─> Updates payout record in SQLite
```

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_usdc REAL NOT NULL,
  items TEXT NOT NULL,
  customer_wallet TEXT
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  created_at INTEGER NOT NULL,
  mural_transaction_id TEXT,
  transaction_hash TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
```

### Payouts Table
```sql
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  mural_payout_request_id TEXT,
  usdc_amount REAL NOT NULL,
  cop_amount REAL,
  exchange_rate REAL,
  status TEXT NOT NULL DEFAULT 'created'
);
```

## API Endpoints

### Internal APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkout` | POST | Create order, return wallet address |
| `/api/payment-status/[orderId]` | GET | Get order/payment/payout status |
| `/api/webhooks/mural` | POST | Handle Mural Pay webhook events |
| `/api/merchant/withdrawals` | GET | List all payouts with status |

### Mural Pay Integration Points

| Mural Endpoint | Our Usage |
|----------------|-----------|
| `GET /api/accounts/{id}` | Get wallet address at checkout |
| `POST /api/webhooks` | Register webhook (one-time setup) |
| `POST /api/payouts/payout` | Create COP payout request |
| `POST /api/payouts/payout/{id}/execute` | Execute payout |
| `GET /api/payouts/payout/{id}` | Check payout status |

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

Cart state managed via React Context:
- `items`: Array of cart items (product + quantity)
- `addItem`: Add product to cart
- `removeItem`: Remove product from cart
- `clearCart`: Empty the cart
- `total`: Computed total in USDC

## Security Considerations

1. **API Key Protection**: Mural API keys stored in environment variables, never exposed to client
2. **Webhook Verification**: Validate webhook signatures to prevent spoofing
3. **Database Access**: SQLite file stored outside web-accessible directories
4. **Input Validation**: Validate all API inputs before processing

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

# Security
WEBHOOK_SECRET=<webhook-secret>

# Database
DATABASE_URL=file:./data/openDestiny.db
```
