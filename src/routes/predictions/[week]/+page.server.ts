import { error, fail, json } from '@sveltejs/kit';
import { getFixturesByWeek, updateFixtureStatuses } from '$lib/server/football/fixtures/index';
import { getUserPredictionsByWeek, submitPrediction } from '$lib/server/football/predictions';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { teams, type Fixture } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

// More aggressive caching for fixtures
const fixturesCache = new Map<
	string,
	{
		fixtures: any[];
		predictions?: Record<string, any>;
		teams?: Record<string, any>;
		timestamp: number;
	}
>();
const FIXTURES_CACHE_TTL = 20 * 1000; // 20 seconds cache

// Cache for teams data
const teamsCache = new Map<string, { teams: Record<string, any>; timestamp: number }>();
const TEAMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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

export const load: PageServerLoad = async ({ params, locals, parent, depends }) => {
	// Add dependency for invalidation
	depends('fixtures:' + params.week);

	// Check if user is authenticated
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
	const currentWeek = parentData.currentWeek;
	const weeks = parentData.weeks;

	// Check if we have cached fixtures first
	const cacheKey = `week-${week}-${userId}`;
	const now = Date.now();
	const cachedData = fixturesCache.get(cacheKey);
	let fixturesWithPrediction = [];
	let predictionsMap = {};
	let teamsMap = {};

	// Check if we have a valid cache entry
	if (cachedData && now - cachedData.timestamp < FIXTURES_CACHE_TTL) {
		fixturesWithPrediction = cachedData.fixtures;

		// Only update live fixtures more frequently
		const hasLiveFixtures = fixturesWithPrediction.some((f: any) => f.isLive);
		if (!hasLiveFixtures) {
			// If no live fixtures, we can use cached data
			return {
				week,
				weeks,
				currentWeek,
				fixtures: fixturesWithPrediction,
				predictions: cachedData.predictions || {},
				teams: cachedData.teams || {},
				isPastWeek: week < currentWeek,
				lastUpdated: new Date(cachedData.timestamp).toISOString()
			};
		}
	}

	// Get fixtures for the selected week - try to avoid DB calls when possible
	const fixtures = await getFixturesByWeek(week);

	// Skip processing if no fixtures
	if (!fixtures.length) {
		return {
			week,
			weeks,
			currentWeek,
			fixtures: [],
			predictions: {},
			teams: {},
			isPastWeek: week < currentWeek,
			lastUpdated: new Date().toISOString()
		};
	}

	// Sort fixtures by date server-side
	const sortedFixtures = [...fixtures].sort(
		(a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
	);

	// Get user's predictions for this week
	const userPredictions = await getUserPredictionsByWeek(userId, week);

	// Extract team IDs for the fixtures
	const teamIds = [...new Set(sortedFixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
	const teamCacheKey = teamIds.sort().join('-');

	// Try to get teams from cache first
	const cachedTeams = teamsCache.get(teamCacheKey);
	if (cachedTeams && now - cachedTeams.timestamp < TEAMS_CACHE_TTL) {
		teamsMap = cachedTeams.teams;
	} else {
		// Fetch teams only if needed
		const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));
		teamsMap = allTeams.reduce(
			(acc, team) => {
				acc[team.id] = team;
				return acc;
			},
			{} as Record<string, typeof teams.$inferSelect>
		);

		// Cache teams data
		teamsCache.set(teamCacheKey, {
			teams: teamsMap,
			timestamp: now
		});
	}

	// Prepare fixtures with prediction info - reuse existing logic
	const isPastWeek = week < currentWeek;
	fixturesWithPrediction = sortedFixtures.map((fixture) => {
		const matchDate = new Date(fixture.matchDate);
		const isWeekend = matchDate.getDay() === 0 || matchDate.getDay() === 6;
		const canPredict = !isPastWeek && canPredictFixture(fixture);

		return {
			...fixture,
			canPredict,
			isPastWeek,
			isWeekend,
			isLive: isFixtureLive(fixture.status),
			predictionClosesAt: new Date(matchDate.getTime() - 60 * 60 * 1000)
		};
	});

	// Convert predictions to a map
	predictionsMap = userPredictions.reduce(
		(acc, prediction) => {
			if (
				prediction.predictedHomeScore !== null &&
				prediction.predictedAwayScore !== null &&
				prediction.predictedHomeScore !== undefined &&
				prediction.predictedAwayScore !== undefined
			) {
				acc[prediction.fixtureId] = {
					...prediction,
					home: prediction.predictedHomeScore,
					away: prediction.predictedAwayScore
				};
			}
			return acc;
		},
		{} as Record<string, any>
	);

	// Cache the processed data
	fixturesCache.set(cacheKey, {
		fixtures: fixturesWithPrediction,
		predictions: predictionsMap,
		teams: teamsMap,
		timestamp: now
	});

	// Return processed data
	return {
		week,
		weeks,
		currentWeek,
		fixtures: fixturesWithPrediction,
		predictions: predictionsMap,
		teams: teamsMap,
		isPastWeek,
		lastUpdated: new Date().toISOString()
	};
};

// Action handlers (keeping them mostly the same)
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
			// Submit predictions using the function
			const results = await submitPrediction(userId, predictionsData);

			// Clear cache to ensure fresh data on next load
			const cacheKey = `week-${week}-${userId}`;
			fixturesCache.delete(cacheKey);

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
	},

	// Optimized updateFixtures action
	updateFixtures: async ({ params, request }) => {
		try {
			// Get week from route parameter
			const week = parseInt(params.week);
			if (isNaN(week)) {
				return fail(400, { success: false, message: 'Invalid week parameter' });
			}

			// Get fixture IDs for this week
			const fixtureData = await request.formData();
			const fixtureIdsParam = fixtureData.get('fixtureIds');

			// Use provided fixture IDs or get all for the week
			let fixtureIds: string[] = [];
			if (fixtureIdsParam) {
				try {
					fixtureIds = JSON.parse(fixtureIdsParam.toString());
				} catch (e) {
					console.error('Failed to parse fixture IDs:', e);
				}
			}

			// Update fixture statuses (this calls the Football API with rate limiting)
			const updateResult = await updateFixtureStatuses(fixtureIds);

			// Only fetch fresh data from DB if we actually had updates
			let fixtures: Fixture[] = [];

			if (updateResult.updated > 0) {
				// Get updated fixtures from DB
				const rawFixtures = await getFixturesByWeek(week);

				// Sort and process fixtures
				const sortedFixtures = [...rawFixtures].sort(
					(a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
				);

				// Process fixtures with the same logic as in load function
				fixtures = sortedFixtures.map((fixture) => {
					const isPastWeek = false; // Not needed for updates
					const matchDate = new Date(fixture.matchDate);
					const isWeekend = matchDate.getDay() === 0 || matchDate.getDay() === 6;
					const canPredict = canPredictFixture(fixture);

					return {
						...fixture,
						canPredict,
						isPastWeek,
						isWeekend,
						isLive: isFixtureLive(fixture.status),
						predictionClosesAt: new Date(matchDate.getTime() - 60 * 60 * 1000)
					};
				});

				// Invalidate all fixture caches for this week
				for (const key of [...fixturesCache.keys()]) {
					if (key.startsWith(`week-${week}`)) {
						fixturesCache.delete(key);
					}
				}
			} else {
				// If no updates, return empty array to let client handle it
				fixtures = [];
			}

			// Return fixtures and update info
			return {
				success: true,
				fixtures,
				updated: updateResult.updated,
				live: fixtures.filter ? fixtures.filter((f) => isFixtureLive(f.status)).length : 0,
				rateLimited: updateResult.rateLimited || false,
				lastUpdated: new Date().toISOString()
			};
		} catch (error) {
			console.error('Error updating fixtures:', error);
			return fail(500, {
				success: false,
				message: 'Failed to update fixtures',
				fixtures: []
			});
		}
	}
} satisfies Actions;
