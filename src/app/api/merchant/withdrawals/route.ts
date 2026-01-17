import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, payments, payouts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all payouts with their related payment and order info
    const allPayouts = await db.query.payouts.findMany({
      orderBy: [desc(payouts.createdAt)],
    });

    // Enrich with order info
    const withdrawals = await Promise.all(
      allPayouts.map(async (payout) => {
        const payment = await db.query.payments.findFirst({
          where: eq(payments.id, payout.paymentId),
        });

        const order = payment
          ? await db.query.orders.findFirst({
              where: eq(orders.id, payment.orderId),
            })
          : null;

        return {
          id: payout.id,
          orderId: order?.id || 'unknown',
          paymentId: payout.paymentId,
          createdAt: payout.createdAt.toISOString(),
          usdcAmount: payout.usdcAmount,
          copAmount: payout.copAmount,
          exchangeRate: payout.exchangeRate,
          status: payout.status,
          muralPayoutRequestId: payout.muralPayoutRequestId,
        };
      })
    );

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error('Withdrawals API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawals' },
      { status: 500 }
    );
  }
}
