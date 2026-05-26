import { db } from '$lib/server/db';
import { fixtures, predictions, teams } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth/auth-schema';
import { eq, and, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CURRENT_SEASON } from '$lib/server/config/season';

const homeTeam = alias(teams, 'homeTeam');
const awayTeam = alias(teams, 'awayTeam');

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user?.id) throw redirect(302, '/auth/login');
	if (!locals.user.emailVerified) throw redirect(302, '/auth/verify-email');

	const userId = locals.user.id;
	const parentData = await parent();
	const currentWeek: number = parentData.currentWeek;

	// Resolve default org
	const [org] = await db
		.select({ id: organization.id })
		.from(organization)
		.where(eq(organization.slug, 'master-league'))
		.limit(1);

	if (!org) {
		return { weekGroups: [], currentWeek, currentSeason: CURRENT_SEASON };
	}

	// Fetch all past predictions joined with fixtures + teams
	const rows = await db
		.select({
			// Prediction fields
			predictionId: predictions.id,
			predictedHome: predictions.predictedHomeScore,
			predictedAway: predictions.predictedAwayScore,
			points: predictions.points,
			// Fixture fields
			fixtureId: fixtures.id,
			weekId: fixtures.weekId,
			season: fixtures.season,
			matchDate: fixtures.matchDate,
			status: fixtures.status,
			homeScore: fixtures.homeScore,
			awayScore: fixtures.awayScore,
			pointsMultiplier: fixtures.pointsMultiplier,
			// Team fields
			homeTeamName: homeTeam.shortName,
			homeLogo: homeTeam.logo,
			awayTeamName: awayTeam.shortName,
			awayLogo: awayTeam.logo
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
		.innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
		.where(
			and(
				eq(predictions.userId, userId),
				eq(predictions.organizationId, org.id),
				eq(fixtures.season, CURRENT_SEASON),
				// Only completed weeks (week strictly less than current week, or finished status)
				lt(fixtures.weekId, currentWeek)
			)
		)
		.orderBy(fixtures.weekId, fixtures.matchDate);

	// Group by weekId
	const weekMap = new Map<
		number,
		{
			weekId: number;
			totalPoints: number;
			correctScorelines: number;
			correctOutcomes: number;
			predictions: typeof rows;
		}
	>();

	for (const row of rows) {
		if (!weekMap.has(row.weekId)) {
			weekMap.set(row.weekId, {
				weekId: row.weekId,
				totalPoints: 0,
				correctScorelines: 0,
				correctOutcomes: 0,
				predictions: []
			});
		}
		const group = weekMap.get(row.weekId)!;
		group.predictions.push(row);
		group.totalPoints += row.points ?? 0;

		// Tally correct scorelines and outcomes
		if (row.status === 'FINISHED' && row.homeScore !== null && row.awayScore !== null) {
			if (row.predictedHome === row.homeScore && row.predictedAway === row.awayScore) {
				group.correctScorelines++;
			} else {
				const predResult =
					row.predictedHome > row.predictedAway
						? 'home'
						: row.predictedHome < row.predictedAway
							? 'away'
							: 'draw';
				const actualResult =
					row.homeScore > row.awayScore ? 'home' : row.homeScore < row.awayScore ? 'away' : 'draw';
				if (predResult === actualResult) group.correctOutcomes++;
			}
		}
	}

	const weekGroups = Array.from(weekMap.values()).sort((a, b) => b.weekId - a.weekId);

	return { weekGroups, currentWeek, currentSeason: CURRENT_SEASON };
};
