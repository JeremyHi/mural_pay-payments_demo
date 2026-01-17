# Payout Failure Troubleshooting Guide

## Symptoms

- Payment is confirmed successfully ✅
- Payout shows as "Failed" ❌
- Order status is "Payout Initiated" (not "Completed")

## Root Causes

### 1. Missing Environment Variables (Most Common)

The payout requires these environment variables in Vercel:

- ✅ `MURAL_ACCOUNT_ID` - Your Mural account ID
- ✅ `MURAL_COUNTERPARTY_ID` - Pre-configured counterparty for COP payouts  
- ✅ `MURAL_PAYOUT_METHOD_ID` - Pre-configured payout method (bank account)
- ✅ `MURAL_TRANSFER_API_KEY` - API key with transfer permissions (different from `MURAL_API_KEY`)

**Check**: Go to Vercel Dashboard > Settings > Environment Variables

**Error Message**: "Mural payout configuration not complete. Missing: MURAL_ACCOUNT_ID, MURAL_COUNTERPARTY_ID"

### 2. Invalid Counterparty or Payout Method

The counterparty or payout method may not exist or may be archived.

**Error Message**: API returns 404 or 400 error

**Fix**: 
- Verify counterparty exists: `GET /api/counterparties/counterparty/{id}`
- Verify payout method exists: `GET /api/counterparties/{id}/payout-methods/{payoutMethodId}`

### 3. Insufficient Account Balance

The account doesn't have enough USDC to cover the payout amount plus fees.

**Error Message**: API returns balance-related error

**Fix**: Ensure account has sufficient USDC balance

### 4. Payout Method Not Verified

The payout method (bank account) may not be verified or may be invalid.

**Error Message**: API returns validation error

**Fix**: Verify payout method status in Mural Pay dashboard

### 5. API Key Permissions

`MURAL_TRANSFER_API_KEY` may not have transfer/payout permissions.

**Error Message**: 401 Unauthorized or 403 Forbidden

**Fix**: Generate a new transfer API key with payout permissions

## How to Diagnose

### Step 1: Check Vercel Function Logs

1. Go to Vercel Dashboard > Your Project > Logs
2. Filter for function: `/api/webhooks/mural`
3. Look for errors containing:
   - "Payout initiation failed"
   - "Mural payout configuration not complete"
   - API error responses with status codes

### Step 2: Verify Environment Variables

Check that ALL of these are set in Vercel:

```bash
MURAL_ACCOUNT_ID=...
MURAL_COUNTERPARTY_ID=...
MURAL_PAYOUT_METHOD_ID=...
MURAL_TRANSFER_API_KEY=...
```

**Important**: `MURAL_TRANSFER_API_KEY` is different from `MURAL_API_KEY`!

### Step 3: Test Payout Creation Manually

Use the Mural Pay API to test payout creation:

```bash
POST https://api-staging.muralpay.com/api/payouts/payout
Authorization: Bearer YOUR_MURAL_TRANSFER_API_KEY
Content-Type: application/json

{
  "sourceAccountId": "YOUR_ACCOUNT_ID",
  "memo": "Test payout",
  "payouts": [
    {
      "amount": {
        "tokenAmount": 1.99,
        "tokenSymbol": "USDC"
      },
      "payoutDetails": {
        "type": "counterpartyPayoutMethod",
        "payoutMethodId": "YOUR_PAYOUT_METHOD_ID"
      },
      "recipientInfo": {
        "type": "counterpartyInfo",
        "counterpartyId": "YOUR_COUNTERPARTY_ID"
      }
    }
  ]
}
```

### Step 4: Check Database

Query the payouts table to see the error state:

- If `muralPayoutRequestId` is `NULL` → Payout creation failed
- If `muralPayoutRequestId` is set → Creation succeeded but execution failed
- Status will be `'failed'` in either case

## Code Flow

1. Payment webhook received → `handleBalanceActivity`
2. Payment recorded in database ✅
3. `initiatePayout` called
4. Payout record created in DB (status: `'created'`)
5. **`createPayoutRequest` called** → Creates payout in Mural
   - **FAILS HERE** if env vars missing or invalid config
6. If successful → Updates DB with `muralPayoutRequestId` (status: `'pending'`)
7. **`executePayoutRequest` called** → Executes payout
   - **FAILS HERE** if balance insufficient or method invalid
8. If successful → Updates DB (status: `'executed'`)
9. If any step fails → Updates DB (status: `'failed'`)

## Quick Fix Checklist

- [ ] Verify `MURAL_ACCOUNT_ID` is set in Vercel
- [ ] Verify `MURAL_COUNTERPARTY_ID` is set in Vercel
- [ ] Verify `MURAL_PAYOUT_METHOD_ID` is set in Vercel
- [ ] Verify `MURAL_TRANSFER_API_KEY` is set in Vercel (NOT `MURAL_API_KEY`)
- [ ] Check Vercel function logs for the actual error message
- [ ] Test payout creation manually with Mural API
- [ ] Verify counterparty and payout method exist and are active
- [ ] Ensure account has sufficient USDC balance

## Enhanced Error Logging

The code now logs detailed error information including:
- Error message
- Stack trace
- API response details (if available)
- Payment and order IDs
- USDC amount

Check Vercel logs for these details to identify the exact failure point.
