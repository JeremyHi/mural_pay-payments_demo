import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database connection string from environment
// Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create PostgreSQL connection
// Disable prepared statements for better compatibility with Supabase connection pooling
const client = postgres(connectionString, {
  prepare: false,
  max: 1, // Supabase connection pooling handles multiple connections
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

export default db;
