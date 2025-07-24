import { error, fail } from '@sveltejs/kit';
import { updateFixtureStatuses } from '$lib/server/football/fixtures/index';
import { recoverMissedFixtures, submitPrediction } from '$lib/server/football/predictions/';
import {
	getFixturesWithPredictions,
	isFixtureLive,
	clearFixtureCache
} from '$lib/server/football/predictions/userPredictions';
import type { PageServerLoad, Actions } from './$types';
import type { Fixture } from '$lib/server/db/schema';
import { processRecentFixtures } from '$lib/scripts/recalculate-points-api';

/**
 * Update fixtures with missing scores
 * This will fetch data from the football API
 */
async function updateMissingScores(): Promise<{ updated: number; processed: number }> {
	try {
		// Call recoverMissedFixtures which now returns an object with detailed results
		const result = await recoverMissedFixtures();

		return {
			updated: result.updated,
			processed: result.reprocessedPredictions
		};
	} catch (err) {
		console.error('Error updating fixtures with missing scores:', err);
		return { updated: 0, processed: 0 };
	}
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

	// Process recent fixtures to ensure points are calculated before displaying the page
	try {
		const result = await processRecentFixtures();
		if (result.processedPredictions > 0) {
			console.log(
				`Processed ${result.processedFixtures} fixtures and ${result.processedPredictions} predictions`
			);
			// Check for and update any fixtures with missing scores
			await updateMissingScores();
		}
	} catch (err) {
		console.error('Points calculation error:', err);
	}

	// Get parent data from layout
	const parentData = await parent();
	const currentWeek = parentData.currentWeek;
	const weeks = parentData.weeks;

	// Get fixtures with predictions using the extracted function
	const { fixturesWithPrediction, predictionsMap, teamsMap, lastUpdated, fromCache } =
		await getFixturesWithPredictions(userId, week, currentWeek);

	// Return processed data
	return {
		week,
		weeks,
		currentWeek,
		fixtures: fixturesWithPrediction,
		predictions: predictionsMap,
		teams: teamsMap,
		// During pre-season (before 2025 fixtures), don't mark weeks as past
		// This prevents showing "past week" when we're just waiting for new season fixtures
		isPastWeek: fixturesWithPrediction.length > 0 && week < currentWeek,
		lastUpdated
	};
};

// Action handlers
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

		// Process form data
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

				// Store the value in our map to collect home/away pairs
				if (!predictionEntries.has(fixtureId)) {
					predictionEntries.set(fixtureId, {});
				}

				const score = parseInt(value.toString()) || 0;
				if (team && (team === 'home' || team === 'away')) {
					predictionEntries.get(fixtureId)[team] = score;
				}
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
			clearFixtureCache(week, userId);

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
				const { fixturesWithPrediction } = await getFixturesWithPredictions('system', week, 0);
				fixtures = fixturesWithPrediction;

				// Invalidate all fixture caches for this week
				clearFixtureCache(week);
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
