import { db } from '$lib/server/db';
import { fixtures as fixturesSchema } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	// Get current week - this will be available in both layout and child routes
	const currentWeek = getCurrentWeek();

	// Get all available weeks - cached for better performance
	const weeksQuery = await db
		.select({ weekId: fixturesSchema.weekId })
		.from(fixturesSchema)
		.groupBy(fixturesSchema.weekId)
		.orderBy(fixturesSchema.weekId);

	const weeks = weeksQuery.map((row) => row.weekId);

	return {
		currentWeek,
		weeks
	};
};
