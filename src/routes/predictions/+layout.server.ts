import { db } from '$lib/server/db';
import { fixtures as fixturesSchema } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { getCurrentWeek } from '$lib/server/football/fixtures/index';
import type { LayoutServerLoad } from './$types';

// Cache for available weeks
let cachedWeeks: number[] | null = null;
let weeksCacheTime = 0;
const WEEKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for current week
let cachedCurrentWeek: number | null = null;
let currentWeekCacheTime = 0;
const CURRENT_WEEK_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	// Start with simple cached values for faster initial load
	let currentWeek = cachedCurrentWeek;
	let weeks = cachedWeeks;

	// Get current week (cached)
	if (!currentWeek || Date.now() - currentWeekCacheTime > CURRENT_WEEK_CACHE_TTL) {
		try {
			currentWeek = await getCurrentWeek();
			cachedCurrentWeek = currentWeek;
			currentWeekCacheTime = Date.now();
		} catch (err) {
			console.error('Error getting current week:', err);
			currentWeek = cachedCurrentWeek || 1;
		}
	}

	// Get available weeks (cached)
	if (!weeks || Date.now() - weeksCacheTime > WEEKS_CACHE_TTL) {
		try {
			const weeksQuery = await db
				.select({ weekId: fixturesSchema.weekId })
				.from(fixturesSchema)
				.groupBy(fixturesSchema.weekId)
				.orderBy(fixturesSchema.weekId);

			weeks = weeksQuery.map((row) => row.weekId);
			cachedWeeks = weeks;
			weeksCacheTime = Date.now();
		} catch (err) {
			console.error('Error fetching available weeks:', err);
			weeks = cachedWeeks || [1];
		}
	}

	// Fire and forget fixture update instead of waiting for it
	import('$lib/server/football/predictions')
		.then(({ checkAndUpdateRecentFixtures }) => {
			checkAndUpdateRecentFixtures(true) // Use cooldown with true to be gentle on the API
				.then((result) => {
					if (result.updated > 0) {
						console.log(
							`Updated ${result.updated} fixtures, including ${result.live} live ones and ${result.recentlyCompleted} recently completed.`
						);
					}
				})
				.catch((err) => {
					console.error('Error updating fixture statuses:', err);
				});
		})
		.catch((err) => {
			console.error('Error importing checkAndUpdateRecentFixtures:', err);
		});

	// Return immediately with available data
	return {
		currentWeek,
		weeks,
		user: locals.user
	};
};
