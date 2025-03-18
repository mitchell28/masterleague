import { db } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { and, eq, count, sum, asc } from 'drizzle-orm';
import { fixtures, predictions, leagueTable, teams } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth/auth-schema';

export const load = (async ({ params, locals }) => {
	// Check for authentication
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const userId = params.id;
	const weekId = parseInt(params.weekId);

	if (isNaN(weekId)) {
		throw error(400, 'Invalid week ID');
	}

	// Get user info
	const userResult = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: {
			id: true,
			name: true,
			email: true
		}
	});

	if (!userResult) {
		throw error(404, 'User not found');
	}

	// Get league table entry for this user
	const leagueEntry = await db.query.leagueTable.findFirst({
		where: eq(leagueTable.userId, userId)
	});

	// Get all away teams (indexed by fixture ID)
	const allAwayTeams = await db
		.select({
			id: teams.id,
			name: teams.name,
			shortName: teams.shortName,
			fixtureId: fixtures.id
		})
		.from(fixtures)
		.innerJoin(teams, eq(fixtures.awayTeamId, teams.id));

	const awayTeamsMap = allAwayTeams.reduce(
		(acc, team) => {
			acc[team.fixtureId] = {
				id: team.id,
				name: team.name,
				shortName: team.shortName
			};
			return acc;
		},
		{} as Record<string, { id: string; name: string; shortName: string }>
	);

	// Get predictions for this user for the specific week, with fixtures and home teams
	const weekPredictions = await db
		.select({
			prediction: predictions,
			fixture: {
				id: fixtures.id,
				weekId: fixtures.weekId,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore,
				matchDate: fixtures.matchDate,
				status: fixtures.status,
				pointsMultiplier: fixtures.pointsMultiplier
			},
			homeTeam: {
				id: teams.id,
				name: teams.name,
				shortName: teams.shortName
			}
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.innerJoin(teams, eq(fixtures.homeTeamId, teams.id))
		.where(and(eq(predictions.userId, userId), eq(fixtures.weekId, weekId)))
		.orderBy(asc(fixtures.matchDate));

	// Get all weeks with predictions for this user (for navigation)
	const userWeeks = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.innerJoin(predictions, eq(predictions.fixtureId, fixtures.id))
		.where(eq(predictions.userId, userId))
		.orderBy(asc(fixtures.weekId));

	// Find current week for initial selection
	const allWeeks = userWeeks.map((w) => w.weekId);

	// Get user stats for all weeks using separate queries for better type safety
	const predictionResults = await db
		.select({
			totalPredictions: count(),
			completedPredictions: count(predictions.points),
			totalPoints: sum(predictions.points)
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.where(eq(predictions.userId, userId))
		.then((rows) => rows[0]);

	// Get all predictions with fixture data in a single query
	const predictionData = await db
		.select({
			prediction: {
				id: predictions.id,
				points: predictions.points,
				predictedHomeScore: predictions.predictedHomeScore,
				predictedAwayScore: predictions.predictedAwayScore
			},
			fixture: {
				id: fixtures.id,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore,
				pointsMultiplier: fixtures.pointsMultiplier,
				status: fixtures.status
			}
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.where(eq(predictions.userId, userId));

	// Calculate counts efficiently without additional queries
	let correctScorelines = 0;
	let correctOutcomes = 0;
	let incorrectPredictions = 0;

	for (const item of predictionData) {
		const { prediction, fixture } = item;

		if (fixture.status === 'FINISHED') {
			if (prediction.points === 0) {
				incorrectPredictions++;
			} else if (
				prediction.predictedHomeScore === fixture.homeScore &&
				prediction.predictedAwayScore === fixture.awayScore
			) {
				correctScorelines++;
			} else if (prediction.points !== null && prediction.points > 0) {
				correctOutcomes++;
			}
		}
	}

	const stats = {
		totalPredictions: predictionResults.totalPredictions,
		completedPredictions: predictionResults.completedPredictions,
		totalPoints: predictionResults.totalPoints || 0, // Handle null
		correctScorelines,
		correctOutcomes,
		incorrectPredictions
	};

	return {
		user: {
			id: userResult.id,
			name: userResult.name,
			email: userResult.email
		},
		stats,
		weekData: {
			weekId: weekId,
			predictions: weekPredictions
		},
		availableWeeks: allWeeks,
		awayTeams: awayTeamsMap,
		leagueEntry
	};
}) satisfies PageServerLoad;
