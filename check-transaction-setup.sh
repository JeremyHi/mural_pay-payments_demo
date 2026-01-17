#!/bin/bash

echo "=== Transaction Setup Diagnostic ==="
echo ""

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running. Start with: npm run dev"
    exit 1
fi

echo ""

# Test checkout endpoint
echo "2. Testing checkout endpoint..."
CHECKOUT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"classic-fortune","name":"Classic Fortune","price":1.99,"quantity":1}]}')

WALLET_ADDRESS=$(echo "$CHECKOUT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('walletAddress', 'ERROR'))" 2>/dev/null)

if [ "$WALLET_ADDRESS" != "ERROR" ] && [ -n "$WALLET_ADDRESS" ]; then
    echo "   ✅ Wallet address retrieved: $WALLET_ADDRESS"
    echo "   ✅ Address length: ${#WALLET_ADDRESS} characters"
    if [[ $WALLET_ADDRESS == 0x* ]]; then
        echo "   ✅ Address format is valid (starts with 0x)"
    else
        echo "   ⚠️  Address doesn't start with 0x (might be invalid)"
    fi
    
    if [ "$WALLET_ADDRESS" == "0x0000000000000000000000000000000000000000" ]; then
        echo "   ⚠️  WARNING: Using placeholder address - Mural API might not be configured"
    fi
else
    echo "   ❌ Failed to get wallet address"
fi

echo ""

# Check database connection
echo "3. Checking database connection..."
if [ -n "$DATABASE_URL" ]; then
    echo "   ✅ DATABASE_URL is set"
    echo "   📊 Database: Supabase (PostgreSQL)"
else
    echo "   ⚠️  DATABASE_URL not set - database operations will fail"
fi

echo ""

# Display important information
echo "=== Important Information for MetaMask ==="
echo ""
echo "Network: Polygon Amoy Testnet"
echo "Chain ID: 80002"
echo "RPC URL: https://rpc-amoy.polygon.technology"
echo "Block Explorer: https://amoy.polygonscan.com"
echo ""
echo "USDC Token Contract (Polygon Amoy):"
echo "0x41e94eb019c0762f9bfcf91821751c38ec663730"
echo ""
echo "Wallet Address (from checkout):"
echo "$WALLET_ADDRESS"
echo ""
echo "=== Common Issues ==="
echo "1. Make sure MetaMask is on Polygon Amoy (not mainnet)"
echo "2. Add USDC token with the contract address above"
echo "3. Ensure you have MATIC for gas fees"
echo "4. Send the EXACT amount shown in checkout"
echo "5. Use USDC token (not MATIC)"
echo ""
