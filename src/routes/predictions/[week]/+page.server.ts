import { error, fail } from '@sveltejs/kit';
import { getFixturesByWeek } from '$lib/server/football/fixtures';
import { getUserPredictionsByWeek, submitPrediction } from '$lib/server/football/predictions';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { teams, predictions } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	// Check if user is authenticated - this is already done in the layout
	const userId = locals.user?.id;
	if (!userId) {
		return { fixtures: [], predictions: {}, teams: {} };
	}

	// Get week from route parameter
	const week = parseInt(params.week);
	if (isNaN(week)) {
		throw error(400, 'Invalid week parameter');
	}

	// Get parent data from layout
	const parentData = await parent();
	const { currentWeek, weeks } = parentData;

	// Get fixtures for the selected week
	const fixtures = await getFixturesByWeek(week);

	// Get user's predictions for this week
	const predictions = await getUserPredictionsByWeek(userId, week);

	// If no fixtures found, return early with empty data
	if (!fixtures.length) {
		return {
			week,
			fixtures: [],
			predictions: {},
			teams: {}
		};
	}

	// Extract unique team IDs for the fixtures
	const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];

	// Only fetch teams that are needed for the current fixtures
	const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));

	const teamsMap = allTeams.reduce(
		(acc, team) => {
			acc[team.id] = team;
			return acc;
		},
		{} as Record<string, typeof teams.$inferSelect>
	);

	// Prepare fixtures with prediction info - ensure all fixtures for past weeks are included
	const fixturesWithPrediction = fixtures.map((fixture) => {
		return {
			...fixture,
			// For past weeks, still include all fixtures regardless of status
			// For current or future weeks, only mark upcoming fixtures as predictable
			canPredict:
				week < currentWeek
					? false // Past week fixtures can't be predicted (read-only)
					: fixture.status === 'upcoming' // Current/future week - only upcoming matches
		};
	});

	// Convert predictions to a map for easier access in the frontend
	const predictionsMap = predictions.reduce(
		(acc, prediction) => {
			// Only include actual predictions with scores
			if (
				prediction.predictedHomeScore !== null &&
				prediction.predictedAwayScore !== null &&
				prediction.predictedHomeScore !== undefined &&
				prediction.predictedAwayScore !== undefined
			) {
				acc[prediction.fixtureId] = prediction;
			}
			return acc;
		},
		{} as Record<string, (typeof predictions)[0]>
	);

	return {
		week,
		fixtures: fixturesWithPrediction,
		predictions: predictionsMap,
		teams: teamsMap
	};
};

export const actions = {
	submitPredictions: async ({ request, locals, params }) => {
		// Check if user is authenticated
		if (!locals.user?.id) {
			throw error(401, 'You must be logged in to submit predictions');
		}
		const userId = locals.user.id;

		// Get week from route parameter
		const week = parseInt(params.week);
		if (isNaN(week)) {
			throw error(400, 'Invalid week parameter');
		}

		// Get the valid fixtures for this week
		const validFixtures = await getFixturesByWeek(week);
		const validFixtureIds = new Set(validFixtures.map((fixture) => fixture.id));

		const data = await request.formData();
		const predictionsData: Array<{
			fixtureId: string;
			homeScore: number;
			awayScore: number;
		}> = [];

		// Process all form fields
		const predictionEntries = new Map();
		for (const [key, value] of data.entries()) {
			if (key.startsWith('prediction-')) {
				// Parse the key correctly to handle UUIDs with hyphens
				const parts = key.split('-');
				const team = parts.pop();
				parts.shift();
				const fixtureId = parts.join('-');

				// Skip if fixture doesn't exist or team is invalid
				if (!validFixtureIds.has(fixtureId) || (team !== 'home' && team !== 'away')) {
					continue;
				}

				// Store the value in our map to collect home/away pairs
				if (!predictionEntries.has(fixtureId)) {
					predictionEntries.set(fixtureId, {});
				}

				const score = parseInt(value.toString()) || 0;
				predictionEntries.get(fixtureId)[team] = score;
			}
		}

		// Now process the collected entries
		for (const [fixtureId, scores] of predictionEntries.entries()) {
			// Only add complete predictions with both home and away scores
			if (scores.home !== undefined && scores.away !== undefined) {
				predictionsData.push({
					fixtureId,
					homeScore: scores.home,
					awayScore: scores.away
				});
			}
		}

		// Only submit if we have valid predictions
		if (predictionsData.length === 0) {
			return { success: true, message: 'No valid predictions to submit' };
		}

		try {
			// Submit predictions using the new bulk prediction function
			const results = await submitPrediction(userId, predictionsData);
			return {
				success: true,
				message: `Successfully saved ${results.length} predictions`
			};
		} catch (error) {
			console.error('Error submitting predictions:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to submit predictions';

			// Check for specific error types
			if (errorMessage.includes('cutoff time has passed')) {
				return fail(400, {
					success: false,
					message: 'The prediction window has closed for one or more matches'
				});
			} else if (errorMessage.includes('not found')) {
				return fail(400, {
					success: false,
					message: 'One or more selected matches are no longer available'
				});
			}

			return fail(400, {
				success: false,
				message: errorMessage
			});
		}
	}
} satisfies Actions;
