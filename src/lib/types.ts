// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in USDC
  image: string;
  emoji: string;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
}

// Order types
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CheckoutResponse {
  orderId: string;
  walletAddress: string;
  totalUsdc: number;
  status: string;
}

export interface PaymentStatusResponse {
  orderId: string;
  orderStatus: string;
  totalUsdc: number;
  payment: {
    id: string;
    status: string;
    amount: number;
    transactionHash: string | null;
  } | null;
  payout: {
    id: string;
    status: string;
    usdcAmount: number;
    copAmount: number | null;
    exchangeRate: number | null;
  } | null;
}

// Merchant dashboard types
export interface WithdrawalInfo {
  id: string;
  orderId: string;
  paymentId: string;
  createdAt: string;
  usdcAmount: number;
  copAmount: number | null;
  exchangeRate: number | null;
  status: string;
  muralPayoutRequestId: string | null;
}

// Mural Pay webhook types
export interface MuralWebhookEvent {
  id: string;
  category: string;
  eventType: string;
  payload: {
    accountId?: string;
    transactionId?: string;
    transactionHash?: string;
    amount?: string;
    currency?: string;
    payoutRequestId?: string;
    status?: string;
  };
  createdAt: string;
}
