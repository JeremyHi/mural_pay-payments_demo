import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/openDestiny.db';

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initializeDatabase() {
  // Create orders table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_usdc REAL NOT NULL,
      items TEXT NOT NULL,
      customer_wallet TEXT
    )
  `);

  // Create payments table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      created_at INTEGER NOT NULL,
      mural_transaction_id TEXT,
      transaction_hash TEXT,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

  // Create payouts table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      mural_payout_request_id TEXT,
      usdc_amount REAL NOT NULL,
      cop_amount REAL,
      exchange_rate REAL,
      status TEXT NOT NULL DEFAULT 'created'
    )
  `);
}

// Initialize on import
initializeDatabase();

export default db;
