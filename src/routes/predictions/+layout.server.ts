import { db } from '$lib/server/db';
import { fixtures as fixturesSchema } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { getCurrentWeek } from '$lib/server/engine/data/fixtures/index';
import type { LayoutServerLoad } from './$types';

// Cache for available weeks
let cachedWeeks: number[] | null = null;
let weeksCacheTime = 0;
const WEEKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for current week
let cachedCurrentWeek: number | null = null;
let currentWeekCacheTime = 0;
const CURRENT_WEEK_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Flag to prevent concurrent updates
let isUpdatingFixtures = false;

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	} else if (!locals.user.emailVerified) {
		throw redirect(302, '/auth/verify-email');
	}

	// Start with cached values for faster initial load
	let currentWeek = cachedCurrentWeek || 1;
	let weeks = cachedWeeks || [1];

	// Get current week (cached)
	if (!cachedCurrentWeek || Date.now() - currentWeekCacheTime > CURRENT_WEEK_CACHE_TTL) {
		try {
			const fetchedWeek = await getCurrentWeek();
			cachedCurrentWeek = fetchedWeek;
			currentWeekCacheTime = Date.now();
			currentWeek = fetchedWeek;
		} catch (err) {
			console.error('Error getting current week:', err);
			// Continue with cached value
		}
	}

	// Get available weeks (cached)
	if (!cachedWeeks || Date.now() - weeksCacheTime > WEEKS_CACHE_TTL) {
		try {
			const weeksQuery = await db
				.select({ weekId: fixturesSchema.weekId })
				.from(fixturesSchema)
				.groupBy(fixturesSchema.weekId)
				.orderBy(fixturesSchema.weekId);

			cachedWeeks = weeksQuery.map((row) => row.weekId);
			weeksCacheTime = Date.now();
			weeks = cachedWeeks;
		} catch (err) {
			console.error('Error fetching available weeks:', err);
			// Continue with cached value
		}
	}

	// Fire and forget fixture update with debounce
	if (!isUpdatingFixtures) {
		isUpdatingFixtures = true;
		Promise.resolve().then(async () => {
			try {
				const { checkAndUpdateRecentFixtures } =
					await import('$lib/server/engine/data/predictions');
				const result = await checkAndUpdateRecentFixtures(true);

				if (result.updated > 0) {
					console.log(
						`Updated ${result.updated} fixtures, including ${result.live} live ones and ${result.recentlyCompleted} recently completed.`
					);
				}
			} catch (err) {
				console.error('Error updating fixture statuses:', err);
			} finally {
				isUpdatingFixtures = false;
			}
		});
	}

	// Immediately return with available data
	return {
		currentWeek,
		weeks
	};
};
