# Setting WEBHOOK_PUBLIC_KEY in Vercel

## Your Webhook Public Key

The public key from your webhook configuration:

```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEeS877lBDrbbPwSbNxx2g+CXsOS20
YGCei5KAkNHGvcMcOizqEJWOQKJcE6uocMWnQYjWLrRL5g7NvuCwRXSn5g==
-----END PUBLIC KEY-----
```

## Steps to Add to Vercel

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `mural-pay-payments-demo`

2. **Open Environment Variables**
   - Click on **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add New Variable**
   - Click **Add New**
   - **Key**: `WEBHOOK_PUBLIC_KEY`
   - **Value**: Paste the entire public key above (all 4 lines including BEGIN/END)
   - **Important**: Vercel preserves newlines, so paste it exactly as shown

4. **Apply to Environments**
   - Check all three:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development

5. **Save and Redeploy**
   - Click **Save**
   - Go to **Deployments** tab
   - Click **...** on the latest deployment
   - Click **Redeploy** to apply the new environment variable

## Format Notes

- ✅ **DO** include the `-----BEGIN PUBLIC KEY-----` line
- ✅ **DO** include the `-----END PUBLIC KEY-----` line  
- ✅ **DO** include all newlines (Vercel handles them correctly)
- ✅ **DO** paste the entire key exactly as shown

- ❌ **DON'T** remove the BEGIN/END lines
- ❌ **DON'T** remove newlines
- ❌ **DON'T** add extra spaces or formatting

## Verification

After setting the variable and redeploying:

1. Test a payment on your site
2. Check Vercel function logs for webhook processing
3. Verify signature verification is working (no "Invalid signature" errors)

## Important: Activate Your Webhook

Your webhook is currently **DISABLED**. You must activate it:

1. Use the Mural Pay API:
   ```bash
   PATCH https://api-staging.muralpay.com/api/webhooks/42e3bc6f-1cec-47d3-adfc-e5935db9d5d3/status
   Authorization: Bearer YOUR_MURAL_API_KEY
   Content-Type: application/json
   
   {
     "status": "ACTIVE"
   }
   ```

2. Or use the Mural Pay Dashboard:
   - Go to Settings > Webhooks
   - Find your webhook
   - Toggle status to **ACTIVE**

## Troubleshooting

If webhooks still don't work after setting the public key:

1. **Check webhook status** - Must be ACTIVE
2. **Check Vercel logs** - Look for signature verification errors
3. **Verify URL** - Must be exactly: `https://mural-pay-payments-demo.vercel.app/api/webhooks/mural`
4. **Check event categories** - Must include `MURAL_ACCOUNT_BALANCE_ACTIVITY`
