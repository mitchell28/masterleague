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
		return {
			fixtures: [],
			predictions: {},
			teams: {},
			week: parseInt(params.week) || 1,
			currentWeek: 1,
			weeks: [],
			isPastWeek: false
		};
	}

	// Get week from route parameter
	const week = parseInt(params.week);
	if (isNaN(week)) {
		throw error(400, 'Invalid week parameter');
	}

	// Get parent data from layout
	const parentData = await parent();
	const { currentWeek, weeks } = parentData;

	// Get fixtures for the selected week - sort them by date server-side
	const fixtures = await getFixturesByWeek(week);

	// Sort fixtures by date server-side to avoid client-side sorting
	const sortedFixtures = [...fixtures].sort(
		(a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
	);

	// Get user's predictions for this week
	const userPredictions = await getUserPredictionsByWeek(userId, week);

	// If no fixtures found, return early with empty data
	if (!sortedFixtures.length) {
		return {
			week,
			weeks,
			currentWeek,
			fixtures: [],
			predictions: {},
			teams: {},
			isPastWeek: week < currentWeek
		};
	}

	// Extract unique team IDs for the fixtures
	const teamIds = [...new Set(sortedFixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];

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
	const fixturesWithPrediction = sortedFixtures.map((fixture) => {
		const isPastWeek = week < currentWeek;

		return {
			...fixture,
			// For past weeks, still include all fixtures regardless of status
			// For current or future weeks, only mark upcoming fixtures as predictable
			canPredict: isPastWeek
				? false // Past week fixtures can't be predicted (read-only)
				: fixture.status === 'upcoming', // Current/future week - only upcoming matches
			isPastWeek // Add this flag to help client-side rendering
		};
	});

	// Convert predictions to a map for easier access in the frontend
	// Pre-process the prediction data to match the expected client format
	const predictionsMap = userPredictions.reduce(
		(acc, prediction) => {
			// Only include actual predictions with scores
			if (
				prediction.predictedHomeScore !== null &&
				prediction.predictedAwayScore !== null &&
				prediction.predictedHomeScore !== undefined &&
				prediction.predictedAwayScore !== undefined
			) {
				acc[prediction.fixtureId] = {
					fixtureId: prediction.fixtureId,
					userId: prediction.userId,
					predictedHomeScore: prediction.predictedHomeScore,
					predictedAwayScore: prediction.predictedAwayScore,
					createdAt: prediction.createdAt,
					// Add client-friendly properties
					home: prediction.predictedHomeScore,
					away: prediction.predictedAwayScore
				};
			}
			return acc;
		},
		{} as Record<string, any>
	);

	// Pre-compute which fixtures should be shown (filtering on server instead of client)
	const visibleFixtures = fixturesWithPrediction.filter(
		(fixture) => week < currentWeek || fixture.canPredict
	);

	return {
		week,
		weeks,
		currentWeek,
		fixtures: visibleFixtures, // Only send fixtures that should be displayed
		predictions: predictionsMap,
		teams: teamsMap,
		isPastWeek: week < currentWeek
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
