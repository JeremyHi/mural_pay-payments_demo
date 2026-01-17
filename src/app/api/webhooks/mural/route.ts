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

  // Map Mural status to our status
  let newStatus = payout.status;
  switch (status?.toLowerCase()) {
    case 'pending':
      newStatus = 'pending';
      break;
    case 'executed':
    case 'in_progress':
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
      newStatus = 'failed';
      break;
  }

  await db.update(payouts)
    .set({ status: newStatus, updatedAt: now })
    .where(eq(payouts.id, payout.id));

  console.log('Payout status updated:', payout.id, '->', newStatus);
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

    await db.update(payouts)
      .set({
        status: 'executed',
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId));

  } catch (error) {
    console.error('Payout initiation failed:', error);
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
  }
}
