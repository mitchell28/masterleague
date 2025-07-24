import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { predictions, fixtures, leagueTable } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import { eq, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		throw redirect(303, '/');
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

		return {
			stats: {
				totalUsers,
				totalPredictions,
				currentWeek,
				completedFixtures,
				upcomingFixtures,
				totalFixtures,
				lastUpdated: new Date().toISOString()
			}
		};
	} catch (err) {
		console.error('Error loading admin data:', err);
		throw error(500, { message: 'Failed to load admin data' });
	}
};
