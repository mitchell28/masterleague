import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fixtures } from '$lib/server/db/schema';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import { sql } from 'drizzle-orm';

export async function GET() {
	try {
		const currentWeek = getCurrentWeek();

		// Get all distinct week IDs
		const result = await db
			.select({ weekId: fixtures.weekId })
			.from(fixtures)
			.groupBy(fixtures.weekId)
			.orderBy(fixtures.weekId);

		const weeks = result.map((row) => row.weekId);

		return json({
			success: true,
			weeks,
			currentWeek
		});
	} catch (error) {
		console.error('Failed to get available weeks:', error);
		return json(
			{
				success: false,
				message: 'Failed to get available weeks'
			},
			{ status: 500 }
		);
	}
}
