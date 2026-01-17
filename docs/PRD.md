# Product Requirements Document: Open Destiny

## Overview

Open Destiny is a fortune cookie e-commerce storefront that accepts USDC payments on Polygon via Mural Pay, with automatic conversion and withdrawal to Colombian Pesos (COP).

## Goals

1. **Demonstrate Mural Pay Integration**: Showcase end-to-end crypto payment flow using Mural Pay APIs
2. **Simple E-commerce Experience**: Provide intuitive shopping cart and checkout experience
3. **Automated Fiat Conversion**: Auto-convert USDC payments to COP and withdraw to bank

## Target Users

### Customer Persona
- Crypto-savvy users with USDC on Polygon network
- Interested in novelty/gift items
- Comfortable with wallet-based payments

### Merchant Persona
- Business accepting crypto payments
- Needs automatic fiat conversion
- Requires bank account withdrawals in local currency (COP)

## Product Catalog

| Name | Price (USDC) | Description |
|------|-------------|-------------|
| Classic Fortune | $1.99 | Traditional wisdom cookie |
| Premium Fortune | $3.99 | Enhanced predictions |
| Diamond Fortune | $9.99 | Luxury gold-flaked cookie |
| Mystery Fortune | $4.99 | Unknown fate awaits |
| Epic Fortune | $14.99 | Legendary prophecies |
| Lucky Bundle (3) | $4.99 | Three classic cookies |
| Fortune Box (6) | $8.99 | Variety pack |
| Destiny Chest (12) | $15.99 | Ultimate collection |

## User Flows

### Customer Journey

1. **Browse**: View fortune cookie products on homepage
2. **Add to Cart**: Click to add items, see cart count update in navbar
3. **Review Cart**: Open cart modal to see selected items and totals
4. **Checkout**: Proceed to checkout modal showing USDC total and wallet address
5. **Payment**: Send USDC from personal wallet to displayed Mural address
6. **Confirmation**: See real-time payment confirmation when transaction detected

### Merchant Journey

1. **Monitor**: View dashboard showing incoming payments
2. **Track Conversion**: See automatic USDC → COP conversion status
3. **Withdrawal**: Monitor bank withdrawal progress

## Functional Requirements

### FR-1: Product Display
- Display 8 fortune cookie products in responsive grid
- Show product name, price in USDC, and description
- Include "Add to Cart" button on each product

### FR-2: Shopping Cart
- Navbar shows cart icon with item count badge
- Cart modal displays all items with quantities
- Support removing items from cart
- Show running total in USDC

### FR-3: Checkout Process
- Create order record in database
- Display total amount in USDC
- Show Mural wallet address for payment
- Provide copy-to-clipboard functionality
- Poll for payment status updates

### FR-4: Payment Detection
- Receive webhook notifications from Mural Pay
- Match incoming payments to pending orders
- Update order status in real-time

### FR-5: Automatic Payout
- Trigger COP payout upon payment confirmation
- Execute payout to pre-configured bank account
- Track payout status through completion

### FR-6: Merchant Dashboard
- List all incoming payments with status
- Show payout/withdrawal status for each payment
- Display real-time updates

## Non-Functional Requirements

### NFR-1: Performance
- Page load under 2 seconds
- Payment status updates within 5 seconds of webhook

### NFR-2: Reliability
- Webhook retry handling
- Idempotent payment processing

### NFR-3: Security
- Webhook signature verification
- Environment variable protection for API keys
- No sensitive data in client-side code

## Success Metrics

1. **Payment Success Rate**: >95% of initiated payments complete successfully
2. **Payout Success Rate**: >95% of confirmed payments convert to COP
3. **User Completion**: >50% of cart additions proceed to payment

## Out of Scope

- User authentication/accounts
- Order history for customers
- Email notifications
- Multiple currencies (USDC only)
- Multiple fiat destinations (COP only)
- Refunds/returns

## Dependencies

- Mural Pay sandbox API access
- Polygon Amoy testnet USDC
- Pre-configured Colombian bank account in Mural Pay
