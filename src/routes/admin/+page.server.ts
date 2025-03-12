import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, predictions, fixtures } from '$lib/server/db/schema';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import { eq, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated and is an admin
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'You do not have permission to access this page');
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

		return {
			stats: {
				totalUsers: userCount[0].count,
				totalPredictions: predictionCount[0].count,
				currentWeek,
				fixturesThisWeek: fixtureCount[0].count
			}
		};
	} catch (err) {
		console.error('Error loading admin stats:', err);
		throw error(500, { message: 'Failed to load admin stats' });
	}
};
