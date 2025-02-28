import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export async function GET() {
	try {
		// Simple query to test Neon connection
		const userCount = await db.select({ count: sql`count(*)` }).from(user);

		// Get database connection info (without exposing credentials)
		const dbUrl = env.DATABASE_URL || '';
		const urlParts = dbUrl.split('@');
		let dbInfo = '';

		if (urlParts.length > 1) {
			// Extract host from the connection string without exposing credentials
			const hostParts = urlParts[1].split('/');
			if (hostParts.length > 0) {
				dbInfo = `Connected to Neon Database on ${hostParts[0]}`;
			}
		}

		return json({
			success: true,
			message: 'Database connection successful',
			dbInfo,
			userCount: Number(userCount[0]?.count) || 0
		});
	} catch (error) {
		console.error('Database connection error:', error);

		return json(
			{
				success: false,
				message: 'Database connection failed',
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}
