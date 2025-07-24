import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { predictions, fixtures, leagueTable } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import { eq, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	try {
		// User count
		const totalUsers = await db
			.select({ count: count() })
			.from(authUser)
			.then((results) => results[0]?.count || 0);

		// Prediction count
		const totalPredictions = await db
			.select({ count: count() })
			.from(predictions)
			.then((results) => results[0]?.count || 0);

		// Current week
		const currentWeek = await getCurrentWeek();

		// Get some additional stats for better dashboard
		const completedFixtures = await db
			.select({ count: count() })
			.from(fixtures)
			.where(eq(fixtures.status, 'completed'))
			.then((results) => results[0]?.count || 0);

		const upcomingFixtures = await db
			.select({ count: count() })
			.from(fixtures)
			.where(eq(fixtures.status, 'scheduled'))
			.then((results) => results[0]?.count || 0);

		const totalFixtures = await db
			.select({ count: count() })
			.from(fixtures)
			.then((results) => results[0]?.count || 0);

		return json({
			stats: {
				totalUsers,
				totalPredictions,
				currentWeek,
				completedFixtures,
				upcomingFixtures,
				totalFixtures,
				lastUpdated: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Error loading admin stats:', err);
		return json({ error: 'Failed to load admin stats' }, { status: 500 });
	}
};
