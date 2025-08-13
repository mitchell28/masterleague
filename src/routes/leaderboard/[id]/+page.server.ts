import { db } from '$lib/server/db';
import { predictions as predictionsTable, fixtures } from '$lib/server/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ params, locals }) => {
	// Check for authentication
	if (!locals.session) {
		throw redirect(303, '/auth/login');
	}

	const userId = params.id;
	const currentDate = new Date();

	// First try to find the current week with upcoming or in-play fixtures
	const upcomingWeek = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.innerJoin(predictionsTable, eq(predictionsTable.fixtureId, fixtures.id))
		.where(and(eq(predictionsTable.userId, userId), gte(fixtures.matchDate, currentDate)))
		.orderBy(fixtures.weekId)
		.limit(1)
		.then((rows) => rows[0]?.weekId);

	if (upcomingWeek) {
		throw redirect(302, `/leaderboard/${userId}/${upcomingWeek}`);
	}

	// If no upcoming fixtures, get the most recent week with predictions
	const recentWeek = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.innerJoin(predictionsTable, eq(predictionsTable.fixtureId, fixtures.id))
		.where(eq(predictionsTable.userId, userId))
		.orderBy(desc(fixtures.weekId))
		.limit(1)
		.then((rows) => rows[0]?.weekId);

	if (recentWeek) {
		throw redirect(302, `/leaderboard/${userId}/${recentWeek}`);
	}

	// If no weeks with predictions found, get the earliest week available
	const firstWeek = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.orderBy(fixtures.weekId)
		.limit(1)
		.then((rows) => rows[0]?.weekId);

	if (firstWeek) {
		throw redirect(302, `/leaderboard/${userId}/${firstWeek}`);
	}

	// Fallback to week 1 if nothing else was found
	throw redirect(302, `/leaderboard/${userId}/1`);
}) satisfies PageServerLoad;
