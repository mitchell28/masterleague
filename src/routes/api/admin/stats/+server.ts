import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, predictions, fixtures } from '$lib/server/db/schema';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import { eq, count } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals }: RequestEvent) {
	// Check if user is authenticated and is an admin
	if (!locals.user) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const userData = await db.select().from(user).where(eq(user.id, locals.user.id)).limit(1);

	if (userData.length === 0 || userData[0].role !== 'admin') {
		return json({ success: false, message: 'Forbidden' }, { status: 403 });
	}

	try {
		// Get current week
		const currentWeek = getCurrentWeek();

		// Count total users
		const userCount = await db.select({ count: count() }).from(user);

		// Count total predictions
		const predictionCount = await db.select({ count: count() }).from(predictions);

		// Count fixtures for current week
		const fixtureCount = await db
			.select({ count: count() })
			.from(fixtures)
			.where(eq(fixtures.weekId, currentWeek));

		return json({
			success: true,
			stats: {
				totalUsers: userCount[0].count,
				totalPredictions: predictionCount[0].count,
				currentWeek,
				fixturesThisWeek: fixtureCount[0].count
			}
		});
	} catch (error) {
		console.error('Failed to get admin stats:', error);
		return json({ success: false, message: 'Failed to get admin stats' }, { status: 500 });
	}
}
