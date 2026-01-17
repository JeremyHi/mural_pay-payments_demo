import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, payments, payouts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Get order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get payment for this order
    const payment = await db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
    });

    // Get payout if payment exists
    let payout = null;
    if (payment) {
      payout = await db.query.payouts.findFirst({
        where: eq(payouts.paymentId, payment.id),
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderStatus: order.status,
      totalUsdc: order.totalUsdc,
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            transactionHash: payment.transactionHash,
          }
        : null,
      payout: payout
        ? {
            id: payout.id,
            status: payout.status,
            usdcAmount: payout.usdcAmount,
            copAmount: payout.copAmount,
            exchangeRate: payout.exchangeRate,
          }
        : null,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}
