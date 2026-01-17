# Supabase Database Setup

## Project Information

- **Project ID**: `edifbsrdzzhbkbeuvrhr`
- **Project Name**: `mural-pay-demo`
- **Region**: `us-east-1`
- **Database Host**: `db.edifbsrdzzhbkbeuvrhr.supabase.co`
- **Project URL**: `https://edifbsrdzzhbkbeuvrhr.supabase.co`

## Getting Your Connection String

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/edifbsrdzzhbkbeuvrhr)
2. Navigate to **Settings** > **Database**
3. Under **Connection string**, select **Connection pooling** mode
4. Copy the connection string (format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)

## Environment Variables

### Local Development (.env.local)

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `DATABASE_URL` with the connection string from Supabase
4. Make sure to set it for **Production**, **Preview**, and **Development** environments

## Database Tables

The following tables have been created:

- `orders` - Customer orders
- `payments` - USDC payment records
- `payouts` - COP withdrawal records

All tables include proper foreign key constraints and indexes for optimal performance.

## Migration Notes

- Migrated from SQLite to PostgreSQL (Supabase)
- All numeric fields use `NUMERIC` type for precise decimal handling
- Timestamps use `TIMESTAMPTZ` for timezone-aware dates
- Foreign keys use `ON DELETE CASCADE` for data integrity

## Troubleshooting

### Connection Issues

- Ensure `DATABASE_URL` is set correctly
- Use **Connection pooling** mode for serverless (Vercel)
- Check that your IP is not blocked in Supabase dashboard

### Type Conversion

- PostgreSQL `NUMERIC` fields return as strings
- API routes convert to numbers before returning JSON
- Frontend receives numeric values as expected
