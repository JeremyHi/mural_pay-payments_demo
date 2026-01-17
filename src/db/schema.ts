import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Order status types
export type OrderStatus = 'pending' | 'paid' | 'payout_initiated' | 'completed' | 'failed';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';
export type PayoutStatus = 'created' | 'pending' | 'executed' | 'completed' | 'failed';

// Orders table - stores customer orders
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  status: text('status').$type<OrderStatus>().notNull().default('pending'),
  totalUsdc: real('total_usdc').notNull(),
  items: text('items').notNull(), // JSON array of cart items
  customerWallet: text('customer_wallet'), // Optional customer wallet address
});

// Payments table - stores received USDC payments
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  muralTransactionId: text('mural_transaction_id'),
  transactionHash: text('transaction_hash'),
  amount: real('amount').notNull(),
  status: text('status').$type<PaymentStatus>().notNull().default('pending'),
});

// Payouts table - stores COP withdrawal records
export const payouts = sqliteTable('payouts', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id').notNull().references(() => payments.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  muralPayoutRequestId: text('mural_payout_request_id'),
  usdcAmount: real('usdc_amount').notNull(),
  copAmount: real('cop_amount'),
  exchangeRate: real('exchange_rate'),
  status: text('status').$type<PayoutStatus>().notNull().default('created'),
});

// Type exports for use in application
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
