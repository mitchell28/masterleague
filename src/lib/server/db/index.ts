import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Create the Neon PostgreSQL client
const sql = neon(env.DATABASE_URL);

// Export the database connection
export const db = drizzle(sql);
