// Mural Pay API Client
import crypto from 'crypto';

const MURAL_API_BASE_URL = process.env.MURAL_API_BASE_URL || 'https://api-staging.muralpay.com';
const MURAL_API_KEY = process.env.MURAL_API_KEY || '';
const MURAL_TRANSFER_API_KEY = process.env.MURAL_TRANSFER_API_KEY || '';

// Types for Mural API responses
export interface MuralAccount {
  id: string;
  name: string;
  status: 'INITIALIZING' | 'ACTIVE';
  accountDetails?: {
    walletDetails: {
      blockchain: string;
      walletAddress: string;
    };
    balances: Array<{
      tokenAmount: number;
      tokenSymbol: string;
    }>;
  };
}

// Detailed payout request response matching MuralPay API
export interface MuralPayoutRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceAccountId: string;
  transactionHash?: string;
  memo?: string;
  status: 'AWAITING_EXECUTION' | 'CANCELED' | 'PENDING' | 'EXECUTED' | 'FAILED';
  payouts: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    amount: {
      tokenAmount: number;
      tokenSymbol: string;
    };
    details: {
      type: 'fiat' | 'blockchain';
      // Fiat payout details
      fiatAndRailCode?: string;
      fiatPayoutStatus?: {
        type: 'created' | 'pending' | 'on-hold' | 'completed' | 'failed' | 'canceled' | 'refundInProgress' | 'refunded';
        initiatedAt?: string;
        completedAt?: string;
        failureReason?: string;
        errorCode?: string;
        refundInitiatedAt?: string;
        refundCompletedAt?: string;
        refundTransactionId?: string;
      };
      fiatAmount?: {
        fiatAmount: number;
        fiatCurrencyCode: string;
      };
      transactionFee?: {
        tokenAmount: number;
        tokenSymbol: string;
      };
      exchangeFeePercentage?: number;
      exchangeRate?: number;
      feeTotal?: {
        tokenAmount: number;
        tokenSymbol: string;
      };
      developerFee?: {
        developerFeePercentage: number;
      };
      // Blockchain payout details
      walletAddress?: string;
      blockchain?: string;
      status?: 'AWAITING_EXECUTION' | 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELED';
    };
    recipientInfo: {
      type: 'counterparty' | 'inline';
      counterpartyId?: string;
      payoutMethodId?: string;
      name?: string;
      details?: {
        type: 'fiat' | 'blockchain';
        fiatCurrencyCode?: string;
        bankName?: string;
        truncatedBankAccountNumber?: string;
        walletAddress?: string;
        blockchain?: string;
      };
    };
  }>;
}

export interface MuralTransaction {
  id: string;
  transactionHash?: string;
  amount: {
    tokenAmount: number;
    tokenSymbol: string;
  };
  status: string;
  createdAt: string;
}

// Helper function to make authenticated requests
async function muralRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useTransferKey = false,
  includeTransferApiKeyHeader = false
): Promise<T> {
  const apiKey = useTransferKey ? MURAL_TRANSFER_API_KEY : MURAL_API_KEY;

  // Validate API key is set
  if (!apiKey) {
    const keyType = useTransferKey ? 'MURAL_TRANSFER_API_KEY' : 'MURAL_API_KEY';
    throw new Error(`${keyType} is not set. Please configure it in your environment variables.`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(options.headers as Record<string, string>),
  };

  // Add transfer-api-key header if required (for create and execute payout endpoints)
  // Note: For create endpoint, we use MURAL_API_KEY for Bearer but still need transfer-api-key header
  if (includeTransferApiKeyHeader) {
    headers['transfer-api-key'] = MURAL_TRANSFER_API_KEY;
  }

  const response = await fetch(`${MURAL_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      error: errorText,
      apiKeyType: useTransferKey ? 'MURAL_TRANSFER_API_KEY' : 'MURAL_API_KEY',
      apiKeySet: !!apiKey,
      apiKeyLength: apiKey.length,
    };
    console.error(`Mural API error:`, errorDetails);
    throw new Error(`Mural API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Get account details including wallet address
export async function getAccount(accountId: string): Promise<MuralAccount> {
  return muralRequest<MuralAccount>(`/api/accounts/${accountId}`);
}

// Get wallet address for the configured account
export async function getWalletAddress(): Promise<string> {
  const accountId = process.env.MURAL_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('MURAL_ACCOUNT_ID not configured');
  }

  const account = await getAccount(accountId);

  if (!account.accountDetails?.walletDetails?.walletAddress) {
    throw new Error('Account wallet address not available');
  }

  return account.accountDetails.walletDetails.walletAddress;
}

// Create a payout request using pre-configured counterparty
export async function createPayoutRequest(
  usdcAmount: number,
  memo: string
): Promise<MuralPayoutRequest> {
  const accountId = process.env.MURAL_ACCOUNT_ID;
  const counterpartyId = process.env.MURAL_COUNTERPARTY_ID;
  const payoutMethodId = process.env.MURAL_PAYOUT_METHOD_ID;

  // Validate all required configuration
  const missing = [];
  if (!accountId) missing.push('MURAL_ACCOUNT_ID');
  if (!counterpartyId) missing.push('MURAL_COUNTERPARTY_ID');
  if (!payoutMethodId) missing.push('MURAL_PAYOUT_METHOD_ID');
  if (!MURAL_TRANSFER_API_KEY) missing.push('MURAL_TRANSFER_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Mural payout configuration not complete. Missing environment variables: ${missing.join(', ')}. Please set these in Vercel environment variables.`);
  }

  const payload = {
    sourceAccountId: accountId,
    memo,
    payouts: [
      {
        amount: {
          tokenAmount: usdcAmount,
          tokenSymbol: 'USDC',
        },
        payoutDetails: {
          type: 'counterpartyPayoutMethod',
          payoutMethodId,
        },
        recipientInfo: {
          type: 'counterpartyInfo',
          counterpartyId,
        },
      },
    ],
  };

  // Use MURAL_API_KEY for Bearer token, but include transfer-api-key header
  // The API requires: Bearer token = MURAL_API_KEY, transfer-api-key header = MURAL_TRANSFER_API_KEY
  return muralRequest<MuralPayoutRequest>(
    '/api/payouts/payout',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    false, // Use MURAL_API_KEY for Bearer token (not transfer key)
    true   // Include transfer-api-key header with MURAL_TRANSFER_API_KEY
  );
}

// Execute a payout request
// exchangeRateToleranceMode: 'FLEXIBLE' (default) executes regardless of rate changes,
// 'STRICT' fails if rates have changed since creation
export async function executePayoutRequest(
  payoutRequestId: string,
  exchangeRateToleranceMode: 'FLEXIBLE' | 'STRICT' = 'FLEXIBLE'
): Promise<MuralPayoutRequest> {
  return muralRequest<MuralPayoutRequest>(
    `/api/payouts/payout/${payoutRequestId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify({
        exchangeRateToleranceMode,
      }),
    },
    false, // Use MURAL_API_KEY for Bearer token (not transfer key)
    true // Include transfer-api-key header as required by API
  );
}

// Get payout request status
export async function getPayoutRequest(payoutRequestId: string): Promise<MuralPayoutRequest> {
  return muralRequest<MuralPayoutRequest>(
    `/api/payouts/payout/${payoutRequestId}`,
    {},
    false // Use MURAL_API_KEY for Bearer token
  );
}

// Search transactions for an account
export async function searchTransactions(
  accountId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }
): Promise<{ results: MuralTransaction[] }> {
  return muralRequest<{ results: MuralTransaction[] }>(
    `/api/transactions/search/account/${accountId}`,
    {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    }
  );
}

// Webhook types
export interface MuralWebhook {
  id: string;
  version: number;
  url: string;
  publicKey: string;
  categories: string[];
  status: 'DISABLED' | 'ACTIVE';
  createdAt: string;
  updatedAt: string;
}

// List all webhooks for the organization
export async function listWebhooks(): Promise<{ results: MuralWebhook[] }> {
  const webhooks = await muralRequest<MuralWebhook[]>(
    '/api/webhooks',
    {
      method: 'GET',
    }
  );
  // API returns array directly, but route expects { results: [...] }
  return { results: webhooks };
}

// Get a specific webhook by ID
export async function getWebhook(webhookId: string): Promise<MuralWebhook> {
  return muralRequest<MuralWebhook>(
    `/api/webhooks/${webhookId}`,
    {
      method: 'GET',
    }
  );
}

// Verify webhook signature using ECDSA with public key
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const publicKey = process.env.WEBHOOK_PUBLIC_KEY;

  // If no public key configured, skip verification in development
  if (!publicKey) {
    console.warn('Webhook signature verification skipped - no public key configured');
    return true;
  }

  if (!signature || !timestamp) {
    console.warn('Webhook missing signature or timestamp headers');
    // In sandbox, allow unsigned webhooks for testing
    if (process.env.MURAL_API_BASE_URL?.includes('staging')) {
      return true;
    }
    return false;
  }

  try {
    // Construct the message that was signed: timestamp.body
    const messageToSign = `${timestamp}.${payload}`;

    // Decode the base64 signature
    const signatureBuffer = Buffer.from(signature, 'base64');

    // Verify the ECDSA signature using the public key
    const isValid = crypto.verify(
      'sha256',
      Buffer.from(messageToSign),
      {
        key: publicKey,
        dsaEncoding: 'der',
      },
      signatureBuffer
    );

    if (!isValid) {
      console.error('Webhook signature verification failed');
      // In sandbox, allow webhooks even if verification fails
      if (process.env.MURAL_API_BASE_URL?.includes('staging')) {
        console.warn('Allowing webhook in staging despite invalid signature');
        return true;
      }
    }

    return isValid;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    // In sandbox, allow webhooks even if verification fails
    if (process.env.MURAL_API_BASE_URL?.includes('staging')) {
      console.warn('Allowing webhook in staging despite verification error');
      return true;
    }
    return false;
  }
}
