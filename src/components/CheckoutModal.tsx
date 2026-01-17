'use client';

import { useCart } from '@/contexts/CartContext';
import { useEffect, useState, useCallback } from 'react';
import { CheckoutResponse, PaymentStatusResponse } from '@/lib/types';
import PaymentStatus from './PaymentStatus';

type CheckoutState = 'idle' | 'creating' | 'awaiting_payment' | 'checking' | 'confirmed' | 'error';

export default function CheckoutModal() {
  const { items, total, isCheckoutOpen, setIsCheckoutOpen, clearCart } = useCart();
  const [state, setState] = useState<CheckoutState>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);

  const createCheckout = useCallback(async () => {
    setState('creating');
    setError(null);

    try {
      const orderItems = items.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const data: CheckoutResponse = await response.json();
      setOrderId(data.orderId);
      setWalletAddress(data.walletAddress);
      setState('awaiting_payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }, [items]);

  const handleClose = useCallback(() => {
    setIsCheckoutOpen(false);
    // Reset state after closing
    setTimeout(() => {
      setState((currentState) => {
        if (currentState === 'confirmed') {
          clearCart();
        }
        return 'idle';
      });
      setOrderId(null);
      setWalletAddress(null);
      setError(null);
      setPaymentStatus(null);
    }, 300);
  }, [setIsCheckoutOpen, clearCart]);

  // Create checkout session when modal opens
  useEffect(() => {
    if (isCheckoutOpen && items.length > 0 && state === 'idle') {
      createCheckout();
    }
  }, [isCheckoutOpen, items.length, state, createCheckout]);

  // Poll for payment status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (orderId && state === 'awaiting_payment') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payment-status/${orderId}`);
          if (response.ok) {
            const data: PaymentStatusResponse = await response.json();
            setPaymentStatus(data);

            if (data.orderStatus === 'paid' || data.orderStatus === 'payout_initiated' || data.orderStatus === 'completed') {
              setState('confirmed');
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error('Error polling payment status:', err);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId, state]);

  const copyAddress = useCallback(async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [walletAddress]);

  const handleBackdropClick = useCallback(() => {
    if (state !== 'awaiting_payment') {
      handleClose();
    }
  }, [state, handleClose]);

  const handleRetry = useCallback(() => {
    setState('idle');
    createCheckout();
  }, [createCheckout]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'awaiting_payment') {
        handleClose();
      }
    };

    if (isCheckoutOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isCheckoutOpen, state, handleClose]);

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {state === 'confirmed' ? 'Payment Confirmed!' : 'Checkout'}
          </h2>
          {state !== 'awaiting_payment' && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close checkout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Creating state */}
          {state === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4" />
              <p className="text-gray-600">Creating your order...</p>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div className="text-center py-8">
              <div className="text-red-500 text-5xl mb-4">!</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Awaiting payment state */}
          {state === 'awaiting_payment' && walletAddress && (
            <div className="space-y-6">
              {/* Order summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">Order Summary</h3>
                <ul className="space-y-2 text-sm">
                  {items.map(item => (
                    <li key={item.product.id} className="flex justify-between">
                      <span className="text-gray-600">
                        {item.product.emoji} {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-purple-700">${total.toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Payment instructions */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">
                  Send USDC to complete your order
                </h3>
                <p className="text-sm text-purple-700 mb-4">
                  Send exactly <span className="font-bold">${total.toFixed(2)} USDC</span> on{' '}
                  <span className="font-bold">Polygon Amoy</span> to:
                </p>

                {/* Wallet address */}
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-gray-700 break-all flex-1">
                      {walletAddress}
                    </code>
                    <button
                      onClick={copyAddress}
                      className={`shrink-0 px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="animate-pulse h-2 w-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Waiting for payment...</span>
              </div>

              {/* Order ID */}
              <p className="text-xs text-center text-gray-400">
                Order ID: {orderId}
              </p>
            </div>
          )}

          {/* Confirmed state */}
          {state === 'confirmed' && (
            <div className="text-center py-8">
              <div className="text-green-500 text-6xl mb-4">&#10003;</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Payment Received!
              </h3>
              <p className="text-gray-600 mb-6">
                Thank you for your order. Your fortune awaits!
              </p>

              {paymentStatus && (
                <PaymentStatus status={paymentStatus} />
              )}

              <button
                onClick={handleClose}
                className="mt-6 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Footer for awaiting payment */}
        {state === 'awaiting_payment' && (
          <div className="border-t p-4 bg-gray-50">
            <button
              onClick={handleClose}
              className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
