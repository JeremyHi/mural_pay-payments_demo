# Fix: 401 Unauthorized Error on Payout

## Error

```
Mural API error (401): {"errorInstanceId":"...","name":"UnauthorizedException","message":"Unauthorized"}
```

## Root Cause

The `MURAL_TRANSFER_API_KEY` is either:
1. **Not set** in Vercel environment variables
2. **Invalid or expired**
3. **Missing required permissions** for payouts

## Solution

### Step 1: Verify MURAL_TRANSFER_API_KEY is Set

1. Go to **Vercel Dashboard** > Your Project > **Settings** > **Environment Variables**
2. Look for `MURAL_TRANSFER_API_KEY`
3. If it's missing, add it

### Step 2: Get Your Transfer API Key

The `MURAL_TRANSFER_API_KEY` is **different** from `MURAL_API_KEY`:

- `MURAL_API_KEY` - Used for reading account info, transactions, etc.
- `MURAL_TRANSFER_API_KEY` - Used for creating and executing payouts (requires transfer permissions)

**How to get it:**
1. Log into Mural Pay Dashboard
2. Go to **Settings** > **API Keys**
3. Create or find a key with **Transfer** permissions
4. Copy the key value

### Step 3: Add to Vercel

1. In Vercel, add environment variable:
   - **Key**: `MURAL_TRANSFER_API_KEY`
   - **Value**: Your transfer API key from Mural Pay
   - **Apply to**: Production, Preview, Development

2. **Save** and **Redeploy**

### Step 4: Verify All Required Variables

Ensure ALL of these are set in Vercel:

- ✅ `MURAL_ACCOUNT_ID`
- ✅ `MURAL_COUNTERPARTY_ID`
- ✅ `MURAL_PAYOUT_METHOD_ID`
- ✅ `MURAL_TRANSFER_API_KEY` ← **This is the one causing the 401 error**

### Step 5: Test Again

After redeploying with the correct `MURAL_TRANSFER_API_KEY`:
1. Make a test payment
2. Check Vercel logs - should see payout creation succeed
3. Payout status should change from "Failed" to "Executed" or "Pending"

## Enhanced Error Messages

The code now provides better error messages:
- If `MURAL_TRANSFER_API_KEY` is missing, you'll see: "MURAL_TRANSFER_API_KEY is not set"
- If API key is invalid, you'll see the 401 error with details

## Quick Checklist

- [ ] `MURAL_TRANSFER_API_KEY` exists in Vercel environment variables
- [ ] Key has **Transfer** permissions in Mural Pay
- [ ] Key is different from `MURAL_API_KEY` (they serve different purposes)
- [ ] Applied to Production, Preview, and Development environments
- [ ] Redeployed after adding the variable
- [ ] Tested with a new payment

## Why Two Different API Keys?

- **MURAL_API_KEY**: Read-only operations (get account, list transactions, etc.)
- **MURAL_TRANSFER_API_KEY**: Write operations requiring transfer permissions (create/execute payouts)

This separation follows security best practices (principle of least privilege).
