import { db } from '$lib/server/db';
import { fixtures as fixturesSchema } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { getCurrentWeek } from '$lib/server/football/fixtures/index';
import { checkAndUpdateRecentFixtures } from '$lib/server/football/predictions';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	// Update fixture statuses if needed - this will update scores and calculate points
	// We do this in the predictions route since it's the most relevant place for live updates
	try {
		// Check for any fixtures that need updating - this handles live matches,
		// recent matches, and upcoming matches efficiently
		checkAndUpdateRecentFixtures(false) // Use cooldown system
			.then((result) => {
				if (result.potentiallyMissed > 0) {
					console.log(
						`Found ${result.potentiallyMissed} fixtures that might have been missed, updating them now.`
					);
				}
				if (result.updated > 0) {
					console.log(
						`Updated ${result.updated} fixtures, including ${result.live} live ones and ${result.recentlyCompleted} recently completed.`
					);
				}
			})
			.catch((err) => {
				console.error('Error updating fixture statuses:', err);
			});
	} catch (err) {
		console.error('Error checking fixtures that need updates:', err);
	}

	const currentWeek = await getCurrentWeek();

	// Get all available weeks - cached for better performance
	const weeksQuery = await db
		.select({ weekId: fixturesSchema.weekId })
		.from(fixturesSchema)
		.groupBy(fixturesSchema.weekId)
		.orderBy(fixturesSchema.weekId);

	const weeks = weeksQuery.map((row) => row.weekId);

	return {
		currentWeek,
		weeks,
		user: locals.user
	};
};
