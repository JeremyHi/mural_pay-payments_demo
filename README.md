# Open Destiny - Fortune Cookie Shop

A demo e-commerce storefront that accepts USDC payments on Polygon via Mural Pay, with automatic conversion and withdrawal to Colombian Pesos (COP).

🔗 **Live Demo**: [https://mural-pay-payments-demo.vercel.app](https://mural-pay-payments-demo.vercel.app)

## Features

- Browse and purchase 8 different fortune cookie products
- Shopping cart with real-time updates
- Checkout with USDC payment on Polygon Amoy testnet
- Automatic payment detection via Mural Pay webhooks
- Automatic COP conversion and bank withdrawal
- Merchant dashboard to track payments and payouts

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **Payments**: Mural Pay API (USDC on Polygon)

## Getting Started

### Prerequisites

- Node.js 18+
- Mural Pay sandbox account with API credentials
- Supabase account (free tier works for testing)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd mural_pay-payments_demo
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template and configure:
```bash
cp .env.example .env.local
```

4. Set up Supabase database:
   - Create a project at [supabase.com](https://supabase.com)
   - Go to Project Settings > Database
   - Copy the connection string (Connection Pooling mode)
   - Or use the direct connection string format:
     `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

5. Edit `.env.local` with your credentials:
```env
# Mural Pay API Configuration
MURAL_API_KEY=your-api-key
MURAL_TRANSFER_API_KEY=your-transfer-api-key
MURAL_ORGANIZATION_ID=your-org-id
MURAL_ACCOUNT_ID=your-account-id
MURAL_COUNTERPARTY_ID=your-counterparty-id
MURAL_PAYOUT_METHOD_ID=your-payout-method-id
MURAL_API_BASE_URL=https://api-staging.muralpay.com

# Supabase Database
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Webhook Security (optional)
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_PUBLIC_KEY=your-webhook-public-key
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── checkout/          # Create orders
│   │   ├── payment-status/    # Check order status
│   │   ├── webhooks/mural/    # Mural Pay webhooks
│   │   └── merchant/          # Merchant APIs
│   ├── merchant/              # Merchant dashboard
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Homepage
├── components/
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   ├── CartModal.tsx
│   ├── CheckoutModal.tsx
│   └── PaymentStatus.tsx
├── contexts/
│   └── CartContext.tsx
├── db/
│   ├── schema.ts              # Drizzle PostgreSQL schema
│   └── index.ts               # Supabase/PostgreSQL client
└── lib/
    ├── mural.ts               # Mural Pay API client
    ├── products.ts            # Product data
    └── types.ts               # TypeScript types
```

## Documentation

See the `/docs` folder for detailed documentation:

- [PRD.md](docs/PRD.md) - Product Requirements Document
- [arch_design.md](docs/arch_design.md) - Architecture Design
- [implementation_plan.md](docs/implementation_plan.md) - Implementation Plan

## Payment Flow

1. Customer adds items to cart
2. Customer proceeds to checkout
3. App creates order and displays Mural wallet address
4. Customer sends USDC from their wallet
5. Mural Pay detects payment and sends webhook
6. App confirms payment and initiates COP payout
7. Funds are converted and sent to merchant's bank

## Testing

To test the payment flow:

1. Get testnet USDC from a Polygon Amoy faucet
2. Add items to cart and checkout
3. Send the exact USDC amount to the displayed wallet
4. Watch the payment confirmation appear
5. Check the merchant dashboard for payout status

## License

MIT
