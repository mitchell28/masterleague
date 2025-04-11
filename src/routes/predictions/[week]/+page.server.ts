import { error, fail } from '@sveltejs/kit';
import { getFixturesByWeek, updateFixtureStatuses } from '$lib/server/football/fixtures/index';
import { getUserPredictionsByWeek, submitPrediction } from '$lib/server/football/predictions';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { teams } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

// Function to check if a fixture can be predicted (more than 30 minutes before kickoff)
function canPredictFixture(fixture: any): boolean {
	// Don't allow prediction if fixture is already in progress or completed
	const inProgressOrCompleted = [
		'IN_PLAY',
		'PAUSED',
		'FINISHED',
		'SUSPENDED',
		'POSTPONED',
		'CANCELLED',
		'AWARDED'
	].includes(fixture.status);
	if (inProgressOrCompleted) return false;

	// Check if it's more than 30 minutes before kickoff
	const matchDate = new Date(fixture.matchDate);
	const now = new Date();
	const cutoffTime = new Date(matchDate.getTime() - 30 * 60 * 1000); // 30 minutes before

	return now < cutoffTime;
}

// Function to check if a fixture is live
function isFixtureLive(status: string): boolean {
	return ['IN_PLAY', 'PAUSED'].includes(status);
}

// Function to determine if a week's fixtures need to be updated
function needsFixtureUpdates(fixtures: any[]): boolean {
	// Get today's date range
	const now = new Date();
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);

	// Check if any fixtures are today or currently live
	return fixtures.some((fixture) => {
		// Check if fixture is already live
		if (isFixtureLive(fixture.status)) {
			return true;
		}

		// Check if fixture is scheduled for today
		const fixtureDate = new Date(fixture.matchDate);
		return fixtureDate >= todayStart && fixtureDate <= todayEnd;
	});
}

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

	// Get parent data from layout and await the Promise values
	const parentData = await parent();
	const currentWeek = await parentData.currentWeek;
	const weeks = parentData.weeks;

	// Get fixtures for the selected week
	let fixtures = await getFixturesByWeek(week);

	// Check if we should update fixture statuses (only for fixtures that are today or live)
	if (fixtures.length > 0 && week === Number(currentWeek) && needsFixtureUpdates(fixtures)) {
		try {
			console.log(`Updating status for ${fixtures.length} fixtures in week ${week}`);

			// Update fixture statuses by calling the function directly (no API needed)
			const updateResult = await updateFixtureStatuses();

			if (updateResult.updated > 0) {
				// Reload fixtures if any were updated
				fixtures = await getFixturesByWeek(week);
				console.log(`Updated ${updateResult.updated} fixtures (${updateResult.live} now live)`);
			}
		} catch (error) {
			console.error('Error updating fixture statuses:', error);
			// Continue execution even if update fails
		}
	}

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

	// Prepare fixtures with prediction info - ensure all fixtures are included
	const fixturesWithPrediction = sortedFixtures.map((fixture) => {
		const isPastWeek = week < currentWeek;
		const matchDate = new Date(fixture.matchDate);
		const isWeekend = matchDate.getDay() === 0 || matchDate.getDay() === 6; // 0 = Sunday, 6 = Saturday

		// Calculate when predictions close
		const oneHourBeforeMatch = new Date(matchDate.getTime() - 60 * 60 * 1000);

		// Determine if fixture can be predicted
		const canPredict = !isPastWeek && canPredictFixture(fixture);

		return {
			...fixture,
			canPredict,
			isPastWeek,
			isWeekend,
			isLive: isFixtureLive(fixture.status),
			predictionClosesAt: oneHourBeforeMatch
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

	// Return all fixtures for the week - don't filter them on the server
	return {
		week,
		weeks,
		currentWeek,
		fixtures: fixturesWithPrediction, // Include all fixtures for the week
		predictions: predictionsMap,
		teams: teamsMap,
		isPastWeek: week < currentWeek,
		lastUpdated: new Date().toISOString() // Add timestamp for when data was last fetched
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

		// Filter to only include fixtures that can be predicted
		const predictableFixtures = validFixtures.filter(canPredictFixture);
		const validFixtureIds = new Set(predictableFixtures.map((fixture) => fixture.id));

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
