# Mural Pay Webhook Configuration for Vercel

## Webhook Endpoint URL

**Your Vercel webhook endpoint:**
```
https://mural-pay-payments-demo.vercel.app/api/webhooks/mural
```

This is the URL you need to configure in Mural Pay for webhook events.

## Required Configuration

### 1. Webhook URL
- **Must be**: `https://mural-pay-payments-demo.vercel.app/api/webhooks/mural`
- **Must use HTTPS** (Vercel provides this automatically)

### 2. Event Categories
Your webhook must subscribe to these event categories:
- `MURAL_ACCOUNT_BALANCE_ACTIVITY` - Receives payment confirmation events
- `PAYOUT_REQUEST` - Receives payout status updates

### 3. Webhook Status
- **Must be ACTIVE** (not DISABLED)
- Webhooks are created in DISABLED state by default
- You must activate it after creation

## Setting Up the Webhook

### Option 1: Using the Verification Script

Run the verification script to check and configure your webhook:

```bash
npx ts-node verify-webhook-config.ts
```

This script will:
- Check if a webhook exists for your Vercel URL
- Create one if it doesn't exist
- Verify it's ACTIVE
- Verify it has the required event categories
- Attempt to activate it if disabled

### Option 2: Using Mural Pay API

#### Create Webhook
```bash
POST https://api-staging.muralpay.com/api/webhooks
Authorization: Bearer YOUR_MURAL_API_KEY
Content-Type: application/json

{
  "url": "https://mural-pay-payments-demo.vercel.app/api/webhooks/mural",
  "categories": ["MURAL_ACCOUNT_BALANCE_ACTIVITY", "PAYOUT_REQUEST"]
}
```

#### Activate Webhook
After creation, activate it:
```bash
PATCH https://api-staging.muralpay.com/api/webhooks/{webhookId}/status
Authorization: Bearer YOUR_MURAL_API_KEY
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

### Option 3: Using Mural Pay Dashboard

1. Log into [Mural Pay Dashboard](https://dashboard.muralpay.com)
2. Navigate to **Settings** > **Webhooks**
3. Click **Create Webhook**
4. Enter URL: `https://mural-pay-payments-demo.vercel.app/api/webhooks/mural`
5. Select event categories:
   - ✅ MURAL_ACCOUNT_BALANCE_ACTIVITY
   - ✅ PAYOUT_REQUEST
6. Click **Create**
7. **Important**: Toggle the webhook status to **ACTIVE**

## Verifying Webhook Configuration

### Check via API Route

Visit your deployed site's webhook check endpoint:
```
https://mural-pay-payments-demo.vercel.app/api/check-webhooks
```

This will show:
- Current webhook configuration
- Status (ACTIVE/DISABLED)
- Event categories
- Recommendations for fixes

### Check via Script

Run locally (requires `.env.local` with `MURAL_API_KEY`):
```bash
npx ts-node verify-webhook-config.ts
```

## Troubleshooting

### Transactions Not Updating

If transactions are stuck after payment confirmation:

1. **Check Webhook Status**
   - Visit: `https://mural-pay-payments-demo.vercel.app/api/check-webhooks`
   - Verify webhook is ACTIVE
   - Verify URL matches Vercel deployment

2. **Check Vercel Logs**
   - Go to Vercel Dashboard > Your Project > Logs
   - Look for webhook-related errors
   - Check for database connection errors
   - Check for signature verification failures

3. **Verify Event Categories**
   - Webhook must include `MURAL_ACCOUNT_BALANCE_ACTIVITY`
   - Without this, payment events won't be received

4. **Check Webhook Signature**
   - If `WEBHOOK_PUBLIC_KEY` is set in Vercel, signature verification is required
   - Get the public key from webhook details in Mural Pay
   - Add to Vercel environment variables as `WEBHOOK_PUBLIC_KEY`
   - **Format**: Paste the entire public key including BEGIN/END lines and newlines
   - Vercel preserves newlines in environment variables

5. **Test Webhook Delivery**
   - Mural Pay retries failed webhooks
   - Check Vercel function logs for delivery attempts
   - Look for 200 OK responses (webhook should return 200)

### Common Issues

#### Webhook Returns 401 (Unauthorized)
- **Cause**: Signature verification failed
- **Fix**: 
  - In staging, signature verification is lenient
  - Add `WEBHOOK_PUBLIC_KEY` to Vercel env vars for production
  - Get public key from webhook details in Mural Pay

#### Webhook Returns 500 (Server Error)
- **Cause**: Database connection or processing error
- **Fix**:
  - Verify `DATABASE_URL` is set in Vercel
  - Check Supabase connection string is correct
  - Verify database tables exist

#### No Webhook Events Received
- **Cause**: Webhook is DISABLED or wrong URL
- **Fix**:
  - Verify webhook status is ACTIVE
  - Verify URL exactly matches: `https://mural-pay-payments-demo.vercel.app/api/webhooks/mural`
  - Check event categories include required ones

## Webhook Event Flow

1. **Payment Received** (`MURAL_ACCOUNT_BALANCE_ACTIVITY`)
   - Mural Pay detects USDC payment
   - Sends webhook to your endpoint
   - Your endpoint:
     - Verifies signature
     - Finds matching pending order
     - Creates payment record
     - Updates order status to "paid"
     - Initiates COP payout

2. **Payout Status Update** (`PAYOUT_REQUEST`)
   - Mural Pay updates payout status
   - Sends webhook to your endpoint
   - Your endpoint:
     - Verifies signature
     - Updates payout record status
     - Updates order status if completed

## Security Notes

- Webhooks use ECDSA signature verification
- Public key is provided when webhook is created
- In staging, signature verification is lenient for testing
- In production, always verify signatures
- Store `WEBHOOK_PUBLIC_KEY` in Vercel environment variables

## Setting WEBHOOK_PUBLIC_KEY in Vercel

When you create a webhook, Mural Pay provides a `publicKey` in the response. To set it in Vercel:

1. **Copy the entire public key** from the webhook response (includes BEGIN/END lines)
2. **Go to Vercel Dashboard** > Your Project > Settings > Environment Variables
3. **Add new variable**:
   - **Name**: `WEBHOOK_PUBLIC_KEY`
   - **Value**: Paste the entire public key exactly as shown:
     ```
     -----BEGIN PUBLIC KEY-----
     MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEeS877lBDrbbPwSbNxx2g+CXsOS20
     YGCei5KAkNHGvcMcOizqEJWOQKJcE6uocMWnQYjWLrRL5g7NvuCwRXSn5g==
     -----END PUBLIC KEY-----
     ```
4. **Apply to**: Production, Preview, and Development
5. **Save** and redeploy

**Important**: 
- Vercel preserves newlines in environment variables
- Include the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` lines
- The newlines (`\n`) in the JSON response should be actual line breaks when pasting

## Next Steps

1. ✅ Configure webhook in Mural Pay (use URL above)
2. ✅ Activate webhook (set status to ACTIVE)
3. ✅ Verify configuration using `/api/check-webhooks`
4. ✅ Test with a small payment
5. ✅ Monitor Vercel logs for webhook deliveries
