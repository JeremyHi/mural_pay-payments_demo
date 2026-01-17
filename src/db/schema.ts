import { pgTable, text, timestamp, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Order status types
export type OrderStatus = 'pending' | 'paid' | 'payout_initiated' | 'completed' | 'failed';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';
export type PayoutStatus = 'created' | 'pending' | 'executed' | 'completed' | 'failed';

// Orders table - stores customer orders
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').$type<OrderStatus>().notNull().default('pending'),
  totalUsdc: numeric('total_usdc', { precision: 10, scale: 2 }).notNull(),
  items: text('items').notNull(), // JSON array of cart items stored as text
  customerWallet: text('customer_wallet'), // Optional customer wallet address
});

// Payments table - stores received USDC payments
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  muralTransactionId: text('mural_transaction_id'),
  transactionHash: text('transaction_hash'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').$type<PaymentStatus>().notNull().default('pending'),
});

// Payouts table - stores COP withdrawal records
export const payouts = pgTable('payouts', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  muralPayoutRequestId: text('mural_payout_request_id'),
  usdcAmount: numeric('usdc_amount', { precision: 10, scale: 2 }).notNull(),
  copAmount: numeric('cop_amount', { precision: 15, scale: 2 }),
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }),
  status: text('status').$type<PayoutStatus>().notNull().default('created'),
});

// Define relations for better query support
export const ordersRelations = relations(orders, ({ many }) => ({
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  payouts: many(payouts),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  payment: one(payments, {
    fields: [payouts.paymentId],
    references: [payments.id],
  }),
}));

// Type exports for use in application
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
