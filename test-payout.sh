#!/bin/bash

# Test script for MuralPay Create Payout Request endpoint
# Replace these values with your actual credentials from Vercel environment variables

# Try BOTH options - one might work depending on your API key setup
MURAL_API_KEY="your-api-key-here"
MURAL_TRANSFER_API_KEY="your-transfer-api-key-here"
MURAL_ACCOUNT_ID="your-account-id-here"
MURAL_COUNTERPARTY_ID="your-counterparty-id-here"
MURAL_PAYOUT_METHOD_ID="your-payout-method-id-here"
MURAL_API_BASE_URL="https://api-staging.muralpay.com"

# Test amount (1.99 USDC)
USDC_AMOUNT=1.99
MEMO="Test payout from curl"

echo "Testing MuralPay Create Payout Request..."
echo "=========================================="
echo ""
echo "Option 1: Using MURAL_TRANSFER_API_KEY for both Bearer and header"
echo "-------------------------------------------------------------------"
curl -X POST "${MURAL_API_BASE_URL}/api/payouts/payout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MURAL_TRANSFER_API_KEY}" \
  -H "transfer-api-key: ${MURAL_TRANSFER_API_KEY}" \
  -d "{
    \"sourceAccountId\": \"${MURAL_ACCOUNT_ID}\",
    \"memo\": \"${MEMO}\",
    \"payouts\": [
      {
        \"amount\": {
          \"tokenAmount\": ${USDC_AMOUNT},
          \"tokenSymbol\": \"USDC\"
        },
        \"payoutDetails\": {
          \"type\": \"counterpartyPayoutMethod\",
          \"payoutMethodId\": \"${MURAL_PAYOUT_METHOD_ID}\"
        },
        \"recipientInfo\": {
          \"type\": \"counterpartyInfo\",
          \"counterpartyId\": \"${MURAL_COUNTERPARTY_ID}\"
        }
      }
    ]
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo ""
echo "Option 2: Using MURAL_API_KEY for Bearer, MURAL_TRANSFER_API_KEY for header"
echo "-----------------------------------------------------------------------------"
curl -X POST "${MURAL_API_BASE_URL}/api/payouts/payout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MURAL_API_KEY}" \
  -H "transfer-api-key: ${MURAL_TRANSFER_API_KEY}" \
  -d "{
    \"sourceAccountId\": \"${MURAL_ACCOUNT_ID}\",
    \"memo\": \"${MEMO}\",
    \"payouts\": [
      {
        \"amount\": {
          \"tokenAmount\": ${USDC_AMOUNT},
          \"tokenSymbol\": \"USDC\"
        },
        \"payoutDetails\": {
          \"type\": \"counterpartyPayoutMethod\",
          \"payoutMethodId\": \"${MURAL_PAYOUT_METHOD_ID}\"
        },
        \"recipientInfo\": {
          \"type\": \"counterpartyInfo\",
          \"counterpartyId\": \"${MURAL_COUNTERPARTY_ID}\"
        }
      }
    ]
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "=========================================="
echo "Troubleshooting:"
echo ""
echo "If BOTH options return 401 Unauthorized:"
echo "1. Verify MURAL_TRANSFER_API_KEY is correct and has transfer permissions"
echo "2. Verify MURAL_API_KEY is correct"
echo "3. Check that all IDs (account, counterparty, payout method) are valid"
echo "4. Contact MuralPay support to verify API key permissions"
echo ""
echo "If Option 1 works: Your code is correct (using transfer key for both)"
echo "If Option 2 works: We need to update code to use MURAL_API_KEY for Bearer token"
echo ""
echo "If you get 201 Created:"
echo "- Copy the payout request ID from the response"
echo "- Use it to test the execute endpoint next"
