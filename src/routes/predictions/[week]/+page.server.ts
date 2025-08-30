import { error, fail } from '@sveltejs/kit';
import { updateFixtureStatuses } from '$lib/server/engine/data/fixtures/index';
import { recoverMissedFixtures, submitPrediction } from '$lib/server/engine/data/predictions/';
import {
	getFixturesWithPredictions,
	isFixtureLive,
	clearFixtureCache
} from '$lib/server/engine/data/predictions/userPredictions';
import {
	intelligentPredictionsProcessing,
	triggerBackgroundProcessing
} from '$lib/server/engine/data/processing/';
import {
	checkForLiveGamesOnPageVisit,
	triggerLiveScoreUpdate
} from '$lib/server/engine/data/fixtures';
import type { PageServerLoad, Actions } from './$types';
import type { Fixture } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals, parent, fetch }) => {
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
	} // Get week from route parameter
	const week = parseInt(params.week);
	if (isNaN(week)) {
		throw error(400, 'Invalid week parameter');
	}

	// Get parent data from layout
	const parentData = await parent();
	const currentWeek = parentData.currentWeek;
	const weeks = parentData.weeks;

	// Get fixtures with predictions using the extracted function
	const { fixturesWithPrediction, predictionsMap, teamsMap, lastUpdated } =
		await getFixturesWithPredictions(userId, week, currentWeek);

	// Intelligent processing decision based on game states, timing, and cron activity
	const processingDecision = await intelligentPredictionsProcessing(
		fixturesWithPrediction,
		lastUpdated ? new Date(lastUpdated) : null,
		currentWeek,
		week
	);

	// Simple live game check - only triggers if needed and doesn't conflict with cron
	const liveGameCheck = await checkForLiveGamesOnPageVisit(fixturesWithPrediction);

	// If live games detected and we should trigger an update (respects cron timing)
	if (liveGameCheck.shouldTriggerUpdate) {
		console.log(`🎮 Live game trigger: ${liveGameCheck.reason}`);
		// Fire and forget - don't wait for response to avoid slowing page load
		triggerLiveScoreUpdate(fetch).catch((err) => console.warn('Live score trigger failed:', err));
	}

	// Handle processing based on intelligent decision
	if (processingDecision.shouldProcess) {
		if (processingDecision.method === 'sync') {
			// For urgent cases (live games, recently finished), process synchronously
			const { checkAndUpdateRecentFixtures } = await import('$lib/server/engine/data/predictions/');

			try {
				console.log(`🔥 Urgent sync processing: ${processingDecision.reason}`);
				await checkAndUpdateRecentFixtures();

				// Clear cache and get fresh data
				clearFixtureCache(week, userId);
				const freshData = await getFixturesWithPredictions(userId, week, currentWeek);

				return {
					week,
					weeks,
					currentWeek,
					fixtures: freshData.fixturesWithPrediction,
					predictions: freshData.predictionsMap,
					teams: freshData.teamsMap,
					isPastWeek: fixturesWithPrediction.length > 0 && week < currentWeek,
					lastUpdated: new Date().toISOString(),
					processingInfo: `⚡ Urgent: ${processingDecision.reason}`,
					// Live game info for frontend smart polling
					liveGameInfo: {
						hasLiveGames: liveGameCheck.hasLiveGames,
						nextCheckIn: liveGameCheck.nextCheckIn,
						liveCount: liveGameCheck.liveFixtureIds.length
					}
				};
			} catch (error) {
				console.error('Urgent processing failed:', error);
				// Fall back to background processing
				triggerBackgroundProcessing('update-predictions', { fetch });
			}
		} else if (processingDecision.method === 'background') {
			// For non-urgent cases, use background processing
			console.log(`🔄 Background processing: ${processingDecision.reason}`);
			triggerBackgroundProcessing('update-predictions', { fetch });
		}
	} else {
		console.log(`✅ No processing needed: ${processingDecision.reason}`);
	}

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
		lastUpdated,
		processingInfo: `💾 ${processingDecision.reason}`,
		// Live game info for frontend smart polling
		liveGameInfo: {
			hasLiveGames: liveGameCheck.hasLiveGames,
			nextCheckIn: liveGameCheck.nextCheckIn,
			liveCount: liveGameCheck.liveFixtureIds.length
		}
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
	},

	// Check for past week updates (for automatic checking)
	checkPastWeekUpdates: async ({ params }) => {
		try {
			const week = parseInt(params.week);
			if (isNaN(week)) {
				return { hasUpdates: false };
			}

			// Get current fixtures from cache/DB
			const { fixturesWithPrediction, lastUpdated } = await getFixturesWithPredictions(
				'system',
				week,
				0
			);

			// If no fixtures or last update is very recent (within 1 minute), no need to check
			if (
				!fixturesWithPrediction.length ||
				(lastUpdated && Date.now() - new Date(lastUpdated).getTime() < 60000)
			) {
				return { hasUpdates: false };
			}

			// Check for finished games that might have updated scores
			const finishedGames = fixturesWithPrediction.filter((f) => f.status === 'FINISHED');

			// If no finished games, no updates possible
			if (finishedGames.length === 0) {
				return { hasUpdates: false };
			}

			// Simple heuristic: if we have finished games and last update was > 5 minutes ago,
			// there might be updates (final scores, late results, etc.)
			const lastUpdateTime = lastUpdated ? new Date(lastUpdated) : new Date(0);
			const timeSinceUpdate = Date.now() - lastUpdateTime.getTime();
			const fiveMinutes = 5 * 60 * 1000;

			return {
				hasUpdates: timeSinceUpdate > fiveMinutes,
				lastUpdated: lastUpdated,
				finishedGames: finishedGames.length
			};
		} catch (error) {
			console.error('Error checking past week updates:', error);
			return { hasUpdates: false };
		}
	}
} satisfies Actions;
