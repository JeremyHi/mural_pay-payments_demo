import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { getWalletAddress } from '@/lib/mural';
import { OrderItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: OrderItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Calculate total
    const totalUsdc = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Round to 2 decimal places
    const roundedTotal = Math.round(totalUsdc * 100) / 100;

    // Get Mural wallet address
    let walletAddress: string;
    try {
      walletAddress = await getWalletAddress();
    } catch (error) {
      console.error('Failed to get wallet address:', error);
      // For demo purposes, return a placeholder if Mural isn't configured
      walletAddress = process.env.MURAL_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
    }

    // Create order in database
    const orderId = uuidv4();
    const now = new Date();

    await db.insert(orders).values({
      id: orderId,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      totalUsdc: roundedTotal.toString(),
      items: JSON.stringify(items),
    });

    return NextResponse.json({
      orderId,
      walletAddress,
      totalUsdc: roundedTotal, // Already a number, no conversion needed
      status: 'pending',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
