import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fixtures, predictions } from '$lib/server/db/schema';

import { eq, and, isNotNull } from 'drizzle-orm';

export async function GET({ url }) {
	const orgId = url.searchParams.get('orgId') || '8290a405-bef2-48d0-8b44-e1defdd1ae07';
	const season = url.searchParams.get('season') || '2025-26';

	try {
		// Check all fixtures (fixtures don't have organizationId)
		const allFixtures = await db.select().from(fixtures);

		// Check fixtures for specific season
		const seasonFixtures = await db.select().from(fixtures).where(eq(fixtures.season, season));

		// Check completed fixtures (have scores)
		const completedFixtures = await db
			.select()
			.from(fixtures)
			.where(and(isNotNull(fixtures.homeScore), isNotNull(fixtures.awayScore)));

		// Check completed fixtures for specific season
		const completedSeasonFixtures = await db
			.select()
			.from(fixtures)
			.where(
				and(
					eq(fixtures.season, season),
					isNotNull(fixtures.homeScore),
					isNotNull(fixtures.awayScore)
				)
			);

		// Check all predictions for this organization
		const allPredictions = await db
			.select()
			.from(predictions)
			.where(eq(predictions.organizationId, orgId));

		// Check users with predictions on completed fixtures (what recalculation looks for)
		const usersWithPredictions = await db
			.select({
				userId: predictions.userId,
				fixtureId: predictions.fixtureId,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore,
				status: fixtures.status,
				season: fixtures.season,
				predictionHome: predictions.predictedHomeScore,
				predictionAway: predictions.predictedAwayScore
			})
			.from(predictions)
			.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
			.where(
				and(
					eq(predictions.organizationId, orgId),
					isNotNull(fixtures.homeScore),
					isNotNull(fixtures.awayScore)
				)
			);

		// Check users with predictions on completed fixtures for specific season
		const usersWithPredictionsThisSeason = await db
			.select({
				userId: predictions.userId,
				fixtureId: predictions.fixtureId,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore,
				status: fixtures.status,
				predictionHome: predictions.predictedHomeScore,
				predictionAway: predictions.predictedAwayScore
			})
			.from(predictions)
			.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
			.where(
				and(
					eq(predictions.organizationId, orgId),
					eq(fixtures.season, season),
					isNotNull(fixtures.homeScore),
					isNotNull(fixtures.awayScore)
				)
			);

		return json({
			debug: {
				orgId,
				requestedSeason: season,
				timestamp: new Date().toISOString()
			},
			summary: {
				allFixtures: allFixtures.length,
				seasonFixtures: seasonFixtures.length,
				completedFixtures: completedFixtures.length,
				completedSeasonFixtures: completedSeasonFixtures.length,
				allPredictions: allPredictions.length,
				usersWithPredictionsOnCompletedFixtures: usersWithPredictions.length,
				usersWithPredictionsThisSeason: usersWithPredictionsThisSeason.length
			},
			samples: {
				fixtures: allFixtures.slice(0, 3),
				completedFixtures: completedFixtures.slice(0, 3),
				predictions: allPredictions.slice(0, 3),
				usersWithPredictions: usersWithPredictions.slice(0, 5)
			},
			analysis: {
				fixtureStatuses: [...new Set(allFixtures.map((f) => f.status))],
				seasons: [...new Set(allFixtures.map((f) => f.season))],
				uniqueUsers: [...new Set(allPredictions.map((p) => p.userId))]
			}
		});
	} catch (error) {
		console.error('Debug endpoint error:', error);
		return json(
			{
				error: 'Failed to fetch debug data',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
