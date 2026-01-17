import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import { orders, payments, payouts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, createPayoutRequest, executePayoutRequest } from '@/lib/mural';

// Webhook event types from Mural Pay
interface WebhookEvent {
  eventId: string;
  deliveryId: string;
  transactionId?: string;
  attemptNumber: number;
  eventCategory: string;
  occurredAt: string;
  payload: {
    type?: string;
    accountId?: string;
    transactionId?: string;
    tokenAmount?: {
      blockchain: string;
      tokenAmount: number;
      tokenSymbol: string;
      tokenContractAddress: string;
    };
    organizationId?: string;
    transactionDetails?: {
      blockchain: string;
      transactionDate: string;
      transactionHash: string;
      sourceWalletAddress: string;
      destinationWalletAddress: string;
    };
    accountWalletAddress?: string;
    payoutRequestId?: string;
    status?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-mural-webhook-signature');
    const timestamp = request.headers.get('x-mural-webhook-timestamp');

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event: WebhookEvent = JSON.parse(rawBody);
    console.log('Received webhook event:', event.eventCategory, event.payload?.type);

    // Handle different event types
    switch (event.eventCategory) {
      case 'MURAL_ACCOUNT_BALANCE_ACTIVITY':
        await handleBalanceActivity(event);
        break;
      case 'PAYOUT_REQUEST':
        await handlePayoutRequest(event);
        break;
      default:
        console.log('Unhandled webhook category:', event.eventCategory);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent retry loops, but log the error
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}

async function handleBalanceActivity(event: WebhookEvent) {
  // Handle account_credited events (payment received)
  if (event.payload?.type === 'account_credited') {
    const { transactionId, tokenAmount, transactionDetails } = event.payload;
    const transactionHash = transactionDetails?.transactionHash;

    if (!tokenAmount || tokenAmount.tokenSymbol !== 'USDC') {
      console.log('Skipping non-USDC transaction');
      return;
    }

    const amount = tokenAmount.tokenAmount;
    console.log('Processing payment webhook for amount:', amount);

    // Find a pending order that matches this amount
    // In a production system, you'd want a more robust matching mechanism
    const tolerance = 0.01;

    try {
      // Get all pending orders and filter by amount, ordered by most recent first
      const allPending = await db.query.orders.findMany({
        where: eq(orders.status, 'pending'),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });

      console.log('All pending orders:', allPending.map(o => ({ id: o.id, total: o.totalUsdc, created: o.createdAt })));

      // Find order with matching amount (within tolerance)
      // Prioritize most recent orders first
      // Note: PostgreSQL numeric fields are returned as strings, so convert for comparison
      const pendingOrder = allPending.find(
        order => Math.abs(Number(order.totalUsdc) - amount) < tolerance
      );

      if (!pendingOrder) {
        console.log('No matching pending order found for amount:', amount);
        // Could store unmatched payments for manual review
        return;
      }

      console.log('Found matching order:', pendingOrder.id, 'for amount:', amount);

      // Create payment record
      const paymentId = uuidv4();
      const now = new Date();

      await db.insert(payments).values({
        id: paymentId,
        orderId: pendingOrder.id,
        createdAt: now,
        muralTransactionId: transactionId || null,
        transactionHash: transactionHash || null,
        amount: amount.toString(),
        status: 'confirmed',
      });

      // Update order status
      await db.update(orders)
        .set({ status: 'paid', updatedAt: now })
        .where(eq(orders.id, pendingOrder.id));

      console.log('Payment recorded, initiating COP payout...');

      // Trigger automatic COP payout
      // Don't let payout errors prevent payment from being recorded
      try {
        await initiatePayout(paymentId, amount, pendingOrder.id);
      } catch (payoutError) {
        // Log payout error but don't fail the webhook
        // Payment is already recorded, payout can be retried later
        console.error('Payout initiation failed (payment still recorded):', payoutError);
      }
    } catch (error) {
      console.error('Error processing payment webhook:', error);
      throw error;
    }
  }
}

async function handlePayoutRequest(event: WebhookEvent) {
  const { payoutRequestId, status } = event.payload;

  if (!payoutRequestId) {
    console.log('No payout request ID in webhook');
    return;
  }

  // Find the payout record
  const payout = await db.query.payouts.findFirst({
    where: eq(payouts.muralPayoutRequestId, payoutRequestId),
  });

  if (!payout) {
    console.log('No payout found for request ID:', payoutRequestId);
    return;
  }

  const now = new Date();

  // Fetch latest payout details from MuralPay API to get exchange rate and COP amount
  let exchangeRate = payout.exchangeRate;
  let copAmount = payout.copAmount;
  
  try {
    const { getPayoutRequest } = await import('@/lib/mural');
    const payoutRequest = await getPayoutRequest(payoutRequestId);
    
    // Extract details from the first payout
    const payoutDetails = payoutRequest.payouts?.[0];
    const fiatPayout = payoutDetails?.details?.type === 'fiat' ? payoutDetails.details : null;
    
    if (fiatPayout) {
      exchangeRate = fiatPayout.exchangeRate ? fiatPayout.exchangeRate.toString() : exchangeRate;
      copAmount = fiatPayout.fiatAmount?.fiatCurrencyCode === 'COP' 
        ? fiatPayout.fiatAmount.fiatAmount.toString() 
        : copAmount;
    }
  } catch (error) {
    console.error('Error fetching payout details from API:', error);
    // Continue with status update even if we can't fetch details
  }

  // Map MuralPay API status to our internal status
  // API statuses: AWAITING_EXECUTION, CANCELED, PENDING, EXECUTED, FAILED
  // Fiat payout statuses: created, pending, on-hold, completed, canceled, refundInProgress, refunded
  let newStatus: 'created' | 'pending' | 'executed' | 'completed' | 'failed' = payout.status as 'created' | 'pending' | 'executed' | 'completed' | 'failed';
  
  const statusLower = status?.toLowerCase() || '';
  
  switch (statusLower) {
    case 'awaiting_execution':
      newStatus = 'created';
      break;
    case 'pending':
      newStatus = 'pending';
      break;
    case 'executed':
      // EXECUTED means blockchain transaction completed, but fiat payout may still be processing
      // We'll check individual payout status via webhook payload if available
      newStatus = 'executed';
      break;
    case 'completed':
    case 'success':
      newStatus = 'completed';
      // Update order status to completed
      const payment = await db.query.payments.findFirst({
        where: eq(payments.id, payout.paymentId),
      });
      if (payment) {
        await db.update(orders)
          .set({ status: 'completed', updatedAt: now })
          .where(eq(orders.id, payment.orderId));
      }
      break;
    case 'failed':
    case 'error':
    case 'canceled':
      newStatus = 'failed';
      break;
    default:
      // Keep existing status if we don't recognize the new status
      console.log('Unknown payout status:', status);
  }

  await db.update(payouts)
    .set({ 
      status: newStatus, 
      exchangeRate,
      copAmount,
      updatedAt: now 
    })
    .where(eq(payouts.id, payout.id));

  console.log('Payout status updated:', payout.id, '->', newStatus, {
    exchangeRate,
    copAmount,
    muralStatus: status,
  });
}

async function initiatePayout(paymentId: string, usdcAmount: number, orderId: string) {
  const now = new Date();

  // Create payout record first
  const payoutId = uuidv4();
  await db.insert(payouts).values({
    id: payoutId,
    paymentId,
    createdAt: now,
    updatedAt: now,
    usdcAmount: usdcAmount.toString(),
    status: 'created',
  });

  // Update order status
  await db.update(orders)
    .set({ status: 'payout_initiated', updatedAt: now })
    .where(eq(orders.id, orderId));

  try {
    // Create payout request in Mural
    const memo = `Open Destiny Order ${orderId}`;
    const payoutRequest = await createPayoutRequest(usdcAmount, memo);

    // Update with Mural payout request ID
    await db.update(payouts)
      .set({
        muralPayoutRequestId: payoutRequest.id,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId));

    console.log('Payout request created:', payoutRequest.id);

    // Execute the payout
    const executedPayout = await executePayoutRequest(payoutRequest.id);
    console.log('Payout executed:', executedPayout.status);

    // Extract payout details from the first payout (we only create one)
    const payoutDetails = executedPayout.payouts?.[0];
    const fiatPayout = payoutDetails?.details?.type === 'fiat' ? payoutDetails.details : null;
    
    // Extract exchange rate, COP amount, and other details
    const exchangeRate = fiatPayout?.exchangeRate;
    const copAmount = fiatPayout?.fiatAmount?.fiatCurrencyCode === 'COP' 
      ? fiatPayout.fiatAmount.fiatAmount 
      : null;

    // Map MuralPay status to our internal status
    let payoutStatus: 'created' | 'pending' | 'executed' | 'completed' | 'failed' = 'executed';
    if (executedPayout.status === 'EXECUTED') {
      // Check individual payout status for more detail
      if (fiatPayout?.fiatPayoutStatus?.type === 'completed') {
        payoutStatus = 'completed';
      } else if (fiatPayout?.fiatPayoutStatus?.type === 'pending' || fiatPayout?.fiatPayoutStatus?.type === 'on-hold') {
        payoutStatus = 'pending';
      } else {
        payoutStatus = 'executed'; // Blockchain transaction executed, fiat payout may still be processing
      }
    } else if (executedPayout.status === 'FAILED') {
      payoutStatus = 'failed';
    } else if (executedPayout.status === 'PENDING') {
      payoutStatus = 'pending';
    }

    await db.update(payouts)
      .set({
        status: payoutStatus,
        exchangeRate: exchangeRate ? exchangeRate.toString() : null,
        copAmount: copAmount ? copAmount.toString() : null,
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId));

  } catch (error) {
    // Log detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = error instanceof Error && 'response' in error
      ? JSON.stringify((error as Error & { response?: unknown }).response, null, 2)
      : undefined;

    console.error('Payout initiation failed:', {
      message: errorMessage,
      stack: errorStack,
      details: errorDetails,
      paymentId,
      orderId,
      usdcAmount,
    });

    await db.update(payouts)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId));

    // Don't mark order as failed - payment was successful, payout just failed
    // Order should remain in 'payout_initiated' or 'paid' status
    // The merchant can retry the payout later
    console.log('Payout failed but payment was successful. Order remains in payout_initiated status.');

    // Re-throw to ensure it's logged in Vercel function logs
    throw error;
  }
}
