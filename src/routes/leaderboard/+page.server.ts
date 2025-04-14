import { db } from '$lib/server/db';
import { leagueTable } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth/auth-schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { processRecentFixtures } from '$lib/scripts/recalculate-points-api';
import { getCurrentWeek } from '$lib/server/football/fixtures';

export const load = (async ({ locals }) => {
	// Process recent fixtures and await the result to ensure points are calculated
	// This ensures points are calculated for new completed matches before displaying the page
	try {
		const result = await processRecentFixtures();
		if (result.processedPredictions > 0) {
			console.log(
				`Processed ${result.processedFixtures} fixtures and ${result.processedPredictions} predictions`
			);
		}
	} catch (err) {
		console.error('Points calculation error:', err);
	}

	// Get the leaderboard data sorted by totalPoints in descending order
	const leaderboard = await db
		.select({
			id: leagueTable.userId,
			username: user.name,
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes,
			predictedFixtures: leagueTable.predictedFixtures,
			completedFixtures: leagueTable.completedFixtures,
			lastUpdated: leagueTable.lastUpdated
		})
		.from(leagueTable)
		.innerJoin(user, eq(leagueTable.userId, user.id))
		.orderBy(desc(leagueTable.totalPoints));

	const currentWeek = await getCurrentWeek();

	return {
		currentWeek,
		leaderboard,
		session: locals.session
	};
}) satisfies PageServerLoad;
