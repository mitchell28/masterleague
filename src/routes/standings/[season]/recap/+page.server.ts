import { db } from '$lib/server/db';
import { leagueTable, fixtures, predictions } from '$lib/server/db/schema';
import { organization, user as authUser } from '$lib/server/db/auth/auth-schema';
import { eq, and, sum, count, sql, max } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user?.id) throw redirect(302, '/auth/login');

	const { season } = params;

	const [org] = await db
		.select({ id: organization.id, name: organization.name })
		.from(organization)
		.where(eq(organization.slug, 'master-league'))
		.limit(1);

	if (!org) throw error(500, 'Organisation not found');

	// Get the full leaderboard for this season with user names
	const standings = await db
		.select({
			userId: leagueTable.userId,
			userName: authUser.name,
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes,
			predictedFixtures: leagueTable.predictedFixtures,
			completedFixtures: leagueTable.completedFixtures
		})
		.from(leagueTable)
		.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
		.where(and(eq(leagueTable.organizationId, org.id), eq(leagueTable.season, season)))
		.orderBy(sql`${leagueTable.totalPoints} DESC`);

	if (standings.length === 0) throw error(404, `No data found for season ${season}`);

	// Best week: highest single-week points by any player
	const weeklyPoints = await db
		.select({
			userId: predictions.userId,
			userName: authUser.name,
			weekId: fixtures.weekId,
			weekPoints: sum(predictions.points).mapWith(Number)
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.innerJoin(authUser, eq(predictions.userId, authUser.id))
		.where(and(eq(predictions.organizationId, org.id), eq(fixtures.season, season)))
		.groupBy(predictions.userId, authUser.name, fixtures.weekId)
		.orderBy(sql`SUM(${predictions.points}) DESC`)
		.limit(1);

	const bestWeekEntry = weeklyPoints[0] ?? null;

	// Champion (position 1)
	const champion = standings[0] ?? null;
	// Most exact scores
	const mostAccurate =
		[...standings].sort((a, b) => (b.correctScorelines ?? 0) - (a.correctScorelines ?? 0))[0] ??
		null;
	// Most predictions submitted
	const mostActive =
		[...standings].sort((a, b) => (b.predictedFixtures ?? 0) - (a.predictedFixtures ?? 0))[0] ??
		null;

	return {
		season,
		orgName: org.name,
		standings,
		awards: {
			champion,
			mostAccurate: mostAccurate?.userId !== champion?.userId ? mostAccurate : null,
			mostActive: mostActive?.userId !== champion?.userId ? mostActive : null,
			bestWeek: bestWeekEntry
		}
	};
};
