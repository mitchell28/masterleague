import { db } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { and, eq, asc, inArray, isNull } from 'drizzle-orm';
import { fixtures, predictions, leagueTable, teams } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth/auth-schema';
import { checkAndUpdateRecentFixtures } from '$lib/server/engine/data/predictions';

export const load = (async ({ params, locals }) => {
	// Check if user is authenticated - using session instead of user.id
	if (!locals.session) {
		throw redirect(303, '/auth/login');
	}

	// Get current user and week from params
	// If weekId is not a number, redirect to week 1
	if (isNaN(parseInt(params.weekId))) {
		return redirect(302, `/leaderboard/${params.id}/1`);
	}

	const userId = params.id;
	const weekId = parseInt(params.weekId);
	const currentUserId = locals.session.userId;
	const isViewingOwnProfile = currentUserId === userId;

	// Check if any fixtures for this week need updates
	try {
		// Just check if there are any IN_PLAY or recently FINISHED fixtures for this week
		const weekFixtures = await db
			.select({
				id: fixtures.id,
				status: fixtures.status,
				lastUpdated: fixtures.lastUpdated
			})
			.from(fixtures)
			.where(eq(fixtures.weekId, weekId))
			.limit(50);

		const hasActiveFixtures = weekFixtures.some(
			(f) => ['IN_PLAY', 'PAUSED'].includes(f.status) || (f.status === 'FINISHED' && !f.lastUpdated)
		);

		if (hasActiveFixtures) {
			// If there are active fixtures for this week, trigger an update
			await checkAndUpdateRecentFixtures(true)
				.then((result) => {
					if (result.updated > 0) {
						console.log(
							`Updated ${result.updated} fixtures for user ${userId} week ${weekId} view`
						);
					}
				})
				.catch((err) => {
					console.error('Error checking fixtures for user page:', err);
				});
		}
	} catch (error) {
		console.error('Error checking for active fixtures:', error);
		// Continue loading page even if this fails
	}

	// Get user information
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

	// Get league entry for this user
	const leagueEntry = await db.query.leagueTable.findFirst({
		where: eq(leagueTable.userId, userId)
	});

	// We'll calculate real-time stats from actual predictions data later
	// Initialize with placeholder stats that will be replaced
	let stats = {
		totalPredictions: 0,
		completedPredictions: 0,
		totalPoints: 0,
		correctScorelines: 0,
		correctOutcomes: 0,
		incorrectPredictions: 0
	};

	// Get all weeks that have fixtures
	const allWeeks = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.then((rows) => rows.map((row) => row.weekId))
		.then((weeks) => weeks.sort((a, b) => a - b));

	try {
		// Step 1: Get all fixtures for this week
		const weekFixturesData = await db
			.select()
			.from(fixtures)
			.where(eq(fixtures.weekId, weekId))
			.orderBy(asc(fixtures.matchDate));

		// Get fixture IDs for more targeted prediction fetching
		const fixtureIds = weekFixturesData.map((fixture) => fixture.id);

		console.log(`Found ${fixtureIds.length} fixtures for week ${weekId}`);

		// Step 2: Get all predictions for this user and these specific fixtures
		const userPredictions = await db
			.select()
			.from(predictions)
			.where(and(eq(predictions.userId, userId), inArray(predictions.fixtureId, fixtureIds)));

		console.log(`Found ${userPredictions.length} predictions for user ${userId} in week ${weekId}`);

		// Log any fixtures with finished status but no scores (which might be causing issues)
		const problematicFixtures = weekFixturesData.filter(
			(fixture) =>
				fixture.status === 'FINISHED' && (fixture.homeScore === null || fixture.awayScore === null)
		);

		if (problematicFixtures.length > 0) {
			console.log(
				`Warning: Found ${problematicFixtures.length} finished fixtures with null scores:`
			);
			problematicFixtures.forEach((fixture) => {
				console.log(
					`Fixture ${fixture.id}: ${fixture.homeScore}-${fixture.awayScore} (status: ${fixture.status})`
				);
			});
		}

		// Step 3: Check if any finished fixtures have null points that need recalculation
		const finishedFixtureIds = weekFixturesData
			.filter((fixture) => fixture.status === 'FINISHED')
			.map((fixture) => fixture.id);

		console.log(`Found ${finishedFixtureIds.length} finished fixtures for week ${weekId}`);

		const predictionMap = new Map();
		userPredictions.forEach((pred) => predictionMap.set(pred.fixtureId, pred));

		let needsPointsUpdate = false;
		let nullPointsCount = 0;

		finishedFixtureIds.forEach((fixtureId) => {
			const prediction = predictionMap.get(fixtureId);
			if (prediction && prediction.points === null) {
				needsPointsUpdate = true;
				nullPointsCount++;
				const fixture = weekFixturesData.find((f) => f.id === fixtureId);
				console.log(
					`Finished fixture ${fixtureId} has null points for prediction ${prediction.id}`
				);
				console.log(
					`Fixture details: status=${fixture?.status}, scores=${fixture?.homeScore}-${fixture?.awayScore}`
				);
			}
		});

		console.log(`Found ${nullPointsCount} predictions with null points for finished fixtures`);

		// If we found predictions that need points calculation, trigger an update
		if (needsPointsUpdate) {
			console.log(`Attempting to update ${nullPointsCount} predictions with null points...`);

			// Try a direct DB update first for any finished fixtures with null points
			try {
				// Import the proper calculation function used by cron jobs
				const { calculatePredictionPoints } = await import('$lib/server/engine/shared/utils');

				// Calculate points properly for each prediction instead of just setting to 0
				for (const fixtureId of finishedFixtureIds) {
					const prediction = predictionMap.get(fixtureId);
					const fixture = weekFixturesData.find((f) => f.id === fixtureId);

					if (
						prediction &&
						prediction.points === null &&
						fixture &&
						fixture.homeScore !== null &&
						fixture.awayScore !== null
					) {
						const calculatedPoints = calculatePredictionPoints(
							prediction.predictedHomeScore,
							prediction.predictedAwayScore,
							fixture.homeScore,
							fixture.awayScore,
							fixture.pointsMultiplier || 1
						);

						await db
							.update(predictions)
							.set({ points: calculatedPoints })
							.where(eq(predictions.id, prediction.id))
							.execute();

						console.log(`Updated prediction ${prediction.id} with ${calculatedPoints} points`);
					}
				}

				console.log(`Manually updated predictions with calculated points`);

				// Re-fetch predictions after manual update
				const manuallyUpdatedPredictions = await db
					.select()
					.from(predictions)
					.where(and(eq(predictions.userId, userId), inArray(predictions.fixtureId, fixtureIds)));

				if (manuallyUpdatedPredictions.length > 0) {
					userPredictions.length = 0;
					userPredictions.push(...manuallyUpdatedPredictions);
				}

				// Check if we still need to run the full update
				const stillNeedsUpdate = userPredictions.some(
					(pred) => finishedFixtureIds.includes(pred.fixtureId) && pred.points === null
				);

				if (stillNeedsUpdate) {
					// Also try the full update process
					await checkAndUpdateRecentFixtures(true);
					console.log('Triggered points recalculation for predictions with null points');

					// Re-fetch predictions after recalculation
					const updatedPredictions = await db
						.select()
						.from(predictions)
						.where(and(eq(predictions.userId, userId), inArray(predictions.fixtureId, fixtureIds)));

					if (updatedPredictions.length > 0) {
						userPredictions.length = 0;
						userPredictions.push(...updatedPredictions);
					}
				}
			} catch (err) {
				console.error('Failed to update prediction points:', err);
			}
		}

		// Create a map of fixture ID to prediction for easier access with detailed logging
		const predictionsByFixture = userPredictions.reduce(
			(map, prediction) => {
				// Process prediction data to ensure points are properly handled
				if (prediction) {
					const fixture = weekFixturesData.find((f) => f.id === prediction.fixtureId);
					const originalPoints = prediction.points;

					// If the fixture is finished but points is null, set it to 0 to prevent endless processing
					if (
						fixture &&
						fixture.status === 'FINISHED' &&
						fixture.homeScore !== null &&
						fixture.awayScore !== null
					) {
						// Ensure we always have a numeric points value for finished fixtures
						if (prediction.points === null || prediction.points === undefined) {
							prediction.points = 0;
							console.log(
								`Fixed null points for prediction ${prediction.id} on fixture ${prediction.fixtureId} (${originalPoints} -> 0)`
							);
						}
					}

					// Here's the critical part - explicitly set totalPoints and log it
					const totalPoints = prediction.points;
					map[prediction.fixtureId] = {
						...prediction,
						// Set totalPoints property explicitly for UI consumption
						totalPoints
					};

					// Log what we're sending to the client
					console.log(
						`Predicted Home Score ${prediction.predictedHomeScore} Predicted Away Score=${prediction.predictedAwayScore}, totalPoints=${totalPoints}`
					);
				}
				return map;
			},
			{} as Record<string, any>
		);

		// Step 3: Get all teams data for these fixtures
		const teamsData = await db.select().from(teams);

		// Create maps for easier access
		const teamsById = teamsData.reduce(
			(map, team) => {
				if (team) {
					map[team.id] = team;
				}
				return map;
			},
			{} as Record<string, any>
		);

		// Step 4: Combine the data and apply prediction hiding logic
		const processedPredictions = weekFixturesData.map((fixture) => {
			const prediction = predictionsByFixture[fixture.id] || null;
			const homeTeam = teamsById[fixture.homeTeamId] || null;

			// Hide predictions for unstarted games when viewing other players
			let displayPrediction = prediction;
			if (!isViewingOwnProfile && prediction) {
				// Check if the game has started (status is not 'SCHEDULED' or 'TIMED')
				const gameHasStarted = !['SCHEDULED', 'TIMED'].includes(fixture.status);

				// Also check if the match date has passed (additional safety check)
				const matchDate = new Date(fixture.matchDate);
				const now = new Date();
				const matchHasStarted = now >= matchDate;

				// Hide prediction if the game hasn't started yet
				if (!gameHasStarted && !matchHasStarted) {
					displayPrediction = null;
				}
			}

			return {
				fixture,
				prediction: displayPrediction,
				homeTeam,
				// Add metadata for the frontend to show appropriate messages
				originalPrediction: prediction, // Keep track if there was a prediction
				isHidden: !isViewingOwnProfile && prediction && displayPrediction === null
			};
		});

		// Create a map of fixture ID to away team
		const awayTeamsMap = weekFixturesData.reduce(
			(acc, fixture) => {
				if (fixture.awayTeamId && teamsById[fixture.awayTeamId]) {
					acc[fixture.id] = teamsById[fixture.awayTeamId];
				}
				return acc;
			},
			{} as Record<string, any>
		);

		// Calculate real-time stats from THIS WEEK's prediction data only
		const weeklyPredictions = userPredictions; // These are already filtered for this week

		// Get fixture data for this week to understand point multipliers and status
		const weeklyFixtures = weekFixturesData; // These are already the week's fixtures

		const fixtureMultiplierMap = new Map();
		const fixtureStatusMap = new Map();
		weeklyFixtures.forEach((fixture) => {
			fixtureMultiplierMap.set(fixture.id, fixture.pointsMultiplier || 1);
			fixtureStatusMap.set(fixture.id, fixture.status);
		});

		// Only count predictions for FINISHED games (games that have been played)
		const playedGamePredictions = weeklyPredictions.filter((pred) => {
			const fixtureStatus = fixtureStatusMap.get(pred.fixtureId);
			return fixtureStatus === 'FINISHED';
		});

		const completedPlayedPredictions = playedGamePredictions.filter((pred) => pred.points !== null);

		// Categorize predictions based on points and multipliers for FINISHED GAMES ONLY
		let correctScorelines = 0;
		let correctOutcomes = 0;
		let incorrectPredictions = 0;
		let totalPoints = 0;

		completedPlayedPredictions.forEach((pred) => {
			const points = pred.points || 0;
			const multiplier = fixtureMultiplierMap.get(pred.fixtureId) || 1;

			// Add to total points
			totalPoints += points;

			if (points === 0) {
				incorrectPredictions++;
			} else if (points === 3 * multiplier) {
				correctScorelines++; // Perfect score
			} else if (points === 1 * multiplier) {
				correctOutcomes++; // Correct outcome but wrong score
			}
		});

		// Update stats with played games data only
		stats = {
			totalPredictions: playedGamePredictions.length, // Only count predictions for played games
			completedPredictions: completedPlayedPredictions.length,
			totalPoints,
			correctScorelines,
			correctOutcomes,
			incorrectPredictions
		};

		console.log(`Weekly stats for user ${userId}, week ${weekId}:`, stats);

		// Log summary of data processing with more detail
		const finishedCount = processedPredictions.filter(
			(p) => p.fixture.status === 'FINISHED' && p.prediction && p.prediction.totalPoints !== null
		).length;

		// Add detailed logging for any remaining processing predictions
		const stillProcessing = processedPredictions.filter(
			(p) =>
				p.fixture.status === 'FINISHED' &&
				p.prediction &&
				(p.prediction.totalPoints === null || p.prediction.totalPoints === undefined)
		);

		if (stillProcessing.length > 0) {
			console.log(`Warning: ${stillProcessing.length} predictions still show as processing:`);
			stillProcessing.forEach((item) => {
				console.log(
					`Fixture ${item.fixture.id} (${item.fixture.status}): prediction=${item.prediction?.id}, ` +
						`points=${item.prediction?.points}, totalPoints=${item.prediction?.totalPoints}`
				);
			});
		}

		console.log(
			`User ${userId}, Week ${weekId}: Processed ${processedPredictions.length} fixtures, ` +
				`${userPredictions.length} predictions, ${finishedCount} have points, ${stillProcessing.length} still processing`
		);

		return {
			leaderboardUser: {
				id: userResult.id,
				name: userResult.name,
				email: userResult.email
			},
			stats,
			weekData: {
				weekId: weekId,
				predictions: processedPredictions
			},
			availableWeeks: allWeeks,
			awayTeams: awayTeamsMap,
			leagueEntry,
			isViewingOwnProfile,
			currentUserId
		};
	} catch (err) {
		console.error('Error fetching prediction data:', err);

		// Still calculate weekly stats even if main prediction loading fails
		try {
			// Get predictions for this specific week only
			const weeklyPredictions = await db
				.select({
					id: predictions.id,
					fixtureId: predictions.fixtureId,
					points: predictions.points
				})
				.from(predictions)
				.where(
					and(
						eq(predictions.userId, userId),
						inArray(
							predictions.fixtureId,
							// Get fixture IDs for this week
							await db
								.select({ id: fixtures.id })
								.from(fixtures)
								.where(eq(fixtures.weekId, weekId))
								.then((rows) => rows.map((r) => r.id))
						)
					)
				);

			const weekFixtures = await db
				.select({
					id: fixtures.id,
					pointsMultiplier: fixtures.pointsMultiplier
				})
				.from(fixtures)
				.where(eq(fixtures.weekId, weekId));

			const fixtureMultiplierMap = new Map();
			weekFixtures.forEach((fixture) => {
				fixtureMultiplierMap.set(fixture.id, fixture.pointsMultiplier || 1);
			});

			const completedPredictions = weeklyPredictions.filter((pred) => pred.points !== null);

			let correctScorelines = 0;
			let correctOutcomes = 0;
			let incorrectPredictions = 0;
			let totalPoints = 0;

			completedPredictions.forEach((pred) => {
				const points = pred.points || 0;
				const multiplier = fixtureMultiplierMap.get(pred.fixtureId) || 1;

				// Add to total points
				totalPoints += points;

				if (points === 0) {
					incorrectPredictions++;
				} else if (points === 3 * multiplier) {
					correctScorelines++;
				} else if (points === 1 * multiplier) {
					correctOutcomes++; // Correct outcome but wrong score
				}
			});

			stats = {
				totalPredictions: weeklyPredictions.length,
				completedPredictions: completedPredictions.length,
				totalPoints,
				correctScorelines,
				correctOutcomes,
				incorrectPredictions
			};

			console.log(`Fallback weekly stats for user ${userId}, week ${weekId}:`, stats);
		} catch (statsErr) {
			console.error('Error calculating fallback stats:', statsErr);
			// Keep the default stats if even this fails
		}

		// Return empty predictions in case of error
		return {
			leaderboardUser: {
				id: userResult.id,
				name: userResult.name,
				email: userResult.email
			},
			stats,
			weekData: {
				weekId: weekId,
				predictions: []
			},
			availableWeeks: allWeeks,
			awayTeams: {},
			leagueEntry,
			isViewingOwnProfile,
			currentUserId
		};
	}
}) satisfies PageServerLoad;
