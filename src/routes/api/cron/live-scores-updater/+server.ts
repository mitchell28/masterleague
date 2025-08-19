import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { fixtures } from '$lib/server/db/schema.js';
import { cache, CacheKeys, CacheHelpers } from '$lib/server/cache/simple-cache.js';
import { eq, and, or, inArray, gt, lt, gte, lte } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/live-scores-updater
 * Smart updater for live fixture scores
 *
 * IMPROVED LOGIC: Checks matches by BOTH status AND time:
 * 1. Matches already marked as live (IN_PLAY, PAUSED)
 * 2. Matches that SHOULD be live based on matchDate/time (even if status is stale)
 *
 * This catches matches that started but the API status hasn't updated yet.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { force, priority = 'normal' } = await request.json().catch(() => ({}));

		// Different rate limiting based on priority
		const rateLimit = priority === 'urgent' ? 2 : 5; // 2 mins for urgent, 5 mins for normal

		if (!force && CacheHelpers.cronRanRecently('live-scores-updater', rateLimit)) {
			const lastRunMinutesAgo = cache.getAge(CacheKeys.cronJob('live-scores-updater'));
			return json({
				success: true,
				message: `Live scores check ran recently (${priority} priority), skipping`,
				last_run_minutes_ago: lastRunMinutesAgo,
				priority
			});
		}

		// Get API key from environment
		const apiKey = process.env.FOOTBALL_DATA_API_KEY;
		if (!apiKey) {
			throw new Error('FOOTBALL_DATA_API_KEY environment variable is required');
		}

		console.log(`⚽ Starting live scores update (${priority} priority)...`);
		const startTime = Date.now();

		// SMART CRON-OPTIMIZED TIME WINDOWS
		const now = new Date();

		// Adaptive time windows based on when we last ran (cron-friendly)
		const lastRunMinutes = cache.getAge(CacheKeys.cronJob('live-scores-updater')) || 60; // Default 1 hour
		const cronWindow = Math.max(lastRunMinutes + 10, 30); // Buffer: last run + 10 mins, minimum 30 mins

		// Multi-layered time windows to ensure we never miss anything
		const longWindow = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours (for ongoing matches)
		const cronCatchupWindow = new Date(now.getTime() - cronWindow * 60 * 1000); // Adaptive to cron frequency
		const liveWindow = new Date(now.getTime() - 30 * 60 * 1000); // 30 mins (for recently started)
		const upcomingWindow = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins future (early kickoffs)

		console.log(`🕐 Cron window: ${cronWindow} minutes (last run was ${lastRunMinutes} mins ago)`);
		console.log(
			`📅 Time windows: 4hr=${longWindow.toLocaleTimeString()}, cron=${cronCatchupWindow.toLocaleTimeString()}, live=${liveWindow.toLocaleTimeString()}, upcoming=${upcomingWindow.toLocaleTimeString()}`
		);

		// COMPREHENSIVE QUERY: Never miss a match with overlapping time windows
		const potentialLiveFixtures = await db
			.select()
			.from(fixtures)
			.where(
				or(
					// Layer 1: Matches currently marked as live (up to 4 hours)
					and(inArray(fixtures.status, ['IN_PLAY', 'PAUSED']), gt(fixtures.matchDate, longWindow)),
					// Layer 2: Cron catchup - matches that could have started since last run
					and(
						inArray(fixtures.status, ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']),
						gte(fixtures.matchDate, cronCatchupWindow),
						lte(fixtures.matchDate, upcomingWindow)
					),
					// Layer 3: Live window - matches that should definitely be live now
					and(
						inArray(fixtures.status, ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'AWARDED']),
						gte(fixtures.matchDate, liveWindow),
						lte(fixtures.matchDate, now)
					),
					// Layer 4: Safety net - any match in last 2 hours with non-finished status
					and(
						inArray(fixtures.status, ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']),
						gt(fixtures.matchDate, new Date(now.getTime() - 2 * 60 * 60 * 1000)),
						lt(fixtures.matchDate, now)
					)
				)
			)
			.limit(30); // Higher limit for comprehensive cron coverage

		if (potentialLiveFixtures.length === 0) {
			console.log('✅ No live fixtures to update');
			CacheHelpers.markCronCompleted('live-scores-updater');
			return json({
				success: true,
				checked: 0,
				updated: 0,
				message: 'No live fixtures found',
				priority,
				execution_time: Date.now() - startTime
			});
		}

		console.log(`📋 Found ${potentialLiveFixtures.length} potential live fixtures to check`);

		// Get matchIds for API call
		const matchIds = potentialLiveFixtures.map((f) => f.matchId).filter(Boolean);

		if (matchIds.length === 0) {
			console.log('❌ No valid matchIds found for live fixtures');
			return json({
				success: false,
				error: 'No valid matchIds for live fixtures'
			});
		}

		// Batch API call with all live matchIds
		const matchIdsParam = matchIds.join(',');
		console.log(`🔄 Updating ${matchIds.length} live fixtures`);

		const MATCHES_API_URL = `https://api.football-data.org/v4/matches?ids=${matchIdsParam}`;
		const response = await fetch(MATCHES_API_URL, {
			headers: {
				'X-Auth-Token': apiKey
			}
		});

		if (!response.ok) {
			if (response.status === 429) {
				console.warn('⚠️ Rate limited - will retry later');
				return json(
					{
						success: false,
						error: 'Rate limited',
						retry_after: priority === 'urgent' ? 120 : 300 // Shorter retry for urgent
					},
					{ status: 429 }
				);
			}
			throw new Error(`API request failed with status ${response.status}`);
		}

		const data = await response.json();
		const apiMatches = data.matches || [];

		let updatedCount = 0;
		const updates: any[] = [];

		// Update fixtures with live scores from API
		for (const apiMatch of apiMatches) {
			const dbFixture = potentialLiveFixtures.find((f) => f.matchId === apiMatch.id.toString());
			if (!dbFixture) continue;

			// Check if update is needed (status change or score change)
			const statusChanged = dbFixture.status !== apiMatch.status;
			const scoreChanged =
				(apiMatch.score?.fullTime?.home !== null &&
					dbFixture.homeScore !== apiMatch.score.fullTime.home) ||
				(apiMatch.score?.fullTime?.away !== null &&
					dbFixture.awayScore !== apiMatch.score.fullTime.away);

			if (statusChanged || scoreChanged) {
				const updateData: any = {
					status: apiMatch.status,
					lastUpdated: new Date()
				};

				// Update scores if available
				if (apiMatch.score?.fullTime?.home !== null) {
					updateData.homeScore = apiMatch.score.fullTime.home;
				}
				if (apiMatch.score?.fullTime?.away !== null) {
					updateData.awayScore = apiMatch.score.fullTime.away;
				}

				await db.update(fixtures).set(updateData).where(eq(fixtures.id, dbFixture.id));

				updatedCount++;
				updates.push({
					fixture_id: dbFixture.id,
					match_id: apiMatch.id,
					old_status: dbFixture.status,
					new_status: apiMatch.status,
					score: apiMatch.score?.fullTime
						? `${apiMatch.score.fullTime.home}-${apiMatch.score.fullTime.away}`
						: 'In Progress'
				});

				console.log(
					`✅ Updated live fixture ${dbFixture.id}: ${apiMatch.status} ${
						apiMatch.score?.fullTime
							? `${apiMatch.score.fullTime.home}-${apiMatch.score.fullTime.away}`
							: '(scores pending)'
					}`
				);
			}
		}

		// Mark job as completed
		CacheHelpers.markCronCompleted('live-scores-updater');

		const executionTime = Date.now() - startTime;
		console.log(
			`⚽ Live scores update completed: ${potentialLiveFixtures.length} checked, ${updatedCount} updated in ${executionTime}ms`
		);

		return json({
			success: true,
			checked: potentialLiveFixtures.length,
			updated: updatedCount,
			updates,
			priority,
			execution_time: executionTime,
			message: `Checked ${potentialLiveFixtures.length} potential live fixtures, updated ${updatedCount} with new scores/status`
		});
	} catch (error) {
		console.error('❌ Live scores update failed:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				priority: 'normal',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
