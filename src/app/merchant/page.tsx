'use client';

import { useEffect, useState, useCallback } from 'react';
import { WithdrawalInfo } from '@/lib/types';

export default function MerchantDashboard() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const response = await fetch('/api/merchant/withdrawals');
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals');
      }
      const data = await response.json();
      setWithdrawals(data.withdrawals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchWithdrawals();

    // Refresh every 10 seconds
    const interval = setInterval(fetchWithdrawals, 10000);

    return () => clearInterval(interval);
  }, [fetchWithdrawals]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'executed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'created':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCOP = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate summary stats
  const totalUsdcReceived = withdrawals.reduce(
    (sum, w) => sum + w.usdcAmount,
    0
  );
  const completedPayouts = withdrawals.filter(
    (w) => w.status === 'completed'
  ).length;
  const pendingPayouts = withdrawals.filter(
    (w) => ['pending', 'created', 'executed'].includes(w.status)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor payments and COP withdrawals
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Total USDC Received
            </h3>
            <p className="text-3xl font-bold text-purple-700">
              ${totalUsdcReceived.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Completed Payouts
            </h3>
            <p className="text-3xl font-bold text-green-600">{completedPayouts}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Pending Payouts
            </h3>
            <p className="text-3xl font-bold text-yellow-600">{pendingPayouts}</p>
          </div>
        </div>

        {/* Withdrawals table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              COP Withdrawals
            </h2>
            <button
              onClick={fetchWithdrawals}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading withdrawals...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchWithdrawals}
                className="mt-4 text-purple-600 hover:text-purple-800"
              >
                Try again
              </button>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No withdrawals yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Withdrawals will appear here when customers make payments
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      USDC Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      COP Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mural ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(withdrawal.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {withdrawal.orderId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${withdrawal.usdcAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCOP(withdrawal.copAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                            withdrawal.status
                          )}`}
                        >
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {withdrawal.muralPayoutRequestId
                          ? `${withdrawal.muralPayoutRequestId.slice(0, 8)}...`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="mt-8 bg-purple-50 rounded-xl p-6">
          <h3 className="font-medium text-purple-900 mb-2">
            How payouts work
          </h3>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>1. Customer sends USDC to your Mural wallet on Polygon</li>
            <li>2. Payment is detected via webhook notification</li>
            <li>3. Automatic payout is created to convert USDC to COP</li>
            <li>4. Funds are sent to your configured bank account</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
