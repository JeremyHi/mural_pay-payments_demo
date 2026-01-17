'use client';

import { PaymentStatusResponse } from '@/lib/types';

interface PaymentStatusProps {
  status: PaymentStatusResponse;
}

export default function PaymentStatus({ status }: PaymentStatusProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'confirmed':
      case 'completed':
      case 'executed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'created':
      case 'paid':
      case 'payout_initiated':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatStatus = (s: string) => {
    return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-left max-w-sm mx-auto">
      <h4 className="font-medium text-gray-700 mb-3 text-sm">Order Status</h4>

      <div className="space-y-3">
        {/* Order status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Order</span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(status.orderStatus)}`}>
            {formatStatus(status.orderStatus)}
          </span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Amount</span>
          <span className="text-sm font-medium">${status.totalUsdc.toFixed(2)} USDC</span>
        </div>

        {/* Payment status */}
        {status.payment && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Payment</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(status.payment.status)}`}>
              {formatStatus(status.payment.status)}
            </span>
          </div>
        )}

        {/* Transaction hash */}
        {status.payment?.transactionHash && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Transaction</span>
            <a
              href={`https://amoy.polygonscan.com/tx/${status.payment.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-800 font-mono"
            >
              {status.payment.transactionHash.slice(0, 8)}...
            </a>
          </div>
        )}

        {/* Payout status */}
        {status.payout && (
          <>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">COP Payout</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(status.payout.status)}`}>
                  {formatStatus(status.payout.status)}
                </span>
              </div>
            </div>

            {status.payout.copAmount && status.payout.exchangeRate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">COP Amount</span>
                <span className="text-sm font-medium">
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(status.payout.copAmount)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
