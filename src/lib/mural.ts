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

export interface MuralPayoutRequest {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  memo?: string;
  payouts: Array<{
    id: string;
    status: string;
    amount: {
      tokenAmount: number;
      tokenSymbol: string;
    };
    recipientInfo: {
      type: string;
      counterpartyId?: string;
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
  useTransferKey = false
): Promise<T> {
  const apiKey = useTransferKey ? MURAL_TRANSFER_API_KEY : MURAL_API_KEY;

  const response = await fetch(`${MURAL_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Mural API error (${response.status}):`, errorText);
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

  if (!accountId || !counterpartyId || !payoutMethodId) {
    throw new Error('Mural payout configuration not complete');
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

  return muralRequest<MuralPayoutRequest>(
    '/api/payouts/payout',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    true // Use transfer API key for payouts
  );
}

// Execute a payout request
export async function executePayoutRequest(payoutRequestId: string): Promise<MuralPayoutRequest> {
  return muralRequest<MuralPayoutRequest>(
    `/api/payouts/payout/${payoutRequestId}/execute`,
    {
      method: 'POST',
    },
    true // Use transfer API key
  );
}

// Get payout request status
export async function getPayoutRequest(payoutRequestId: string): Promise<MuralPayoutRequest> {
  return muralRequest<MuralPayoutRequest>(
    `/api/payouts/payout/${payoutRequestId}`,
    {},
    true
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

// Webhook configuration types
export interface MuralWebhook {
  id: string;
  url: string;
  status: 'ACTIVE' | 'DISABLED';
  eventCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MuralWebhookList {
  results: MuralWebhook[];
}

// List all webhooks
export async function listWebhooks(): Promise<MuralWebhookList> {
  return muralRequest<MuralWebhookList>('/api/webhooks');
}

// Get a specific webhook
export async function getWebhook(webhookId: string): Promise<MuralWebhook> {
  return muralRequest<MuralWebhook>(`/api/webhooks/${webhookId}`);
}

// Create a webhook
export async function createWebhook(
  url: string,
  eventCategories: string[]
): Promise<MuralWebhook> {
  return muralRequest<MuralWebhook>(
    '/api/webhooks',
    {
      method: 'POST',
      body: JSON.stringify({
        url,
        eventCategories,
      }),
    }
  );
}

// Update webhook (enable/disable or change URL)
export async function updateWebhook(
  webhookId: string,
  updates: {
    url?: string;
    status?: 'ACTIVE' | 'DISABLED';
    eventCategories?: string[];
  }
): Promise<MuralWebhook> {
  return muralRequest<MuralWebhook>(
    `/api/webhooks/${webhookId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
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
