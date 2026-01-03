import { schedules } from '@trigger.dev/sdk';

// Helper function to get the base URL
function getBaseUrl(): string {
	if (process.env.ORIGIN) {
		return process.env.ORIGIN;
	}
	if (process.env.PUBLIC_BETTER_AUTH_URL) {
		return process.env.PUBLIC_BETTER_AUTH_URL;
	}
	return 'https://masterleague.app';
}

// Helper to check match activity intelligently
async function checkMatchActivity(): Promise<{
	needsProcessing: boolean;
	hasLiveMatches: boolean;
	hasUpcomingMatches: boolean;
	hasRecentlyFinished: boolean;
	needsFinishCheck: boolean;
}> {
	const baseUrl = getBaseUrl();

	try {
		const response = await fetch(`${baseUrl}/api/cron/check-active-matches`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			console.error('Failed to check match activity:', response.statusText);
			// Fail safe - assume activity
			return {
				needsProcessing: true,
				hasLiveMatches: true,
				hasUpcomingMatches: true,
				hasRecentlyFinished: true,
				needsFinishCheck: true
			};
		}

		return await response.json();
	} catch (error) {
		console.error('Error checking match activity:', error);
		// Fail safe
		return {
			needsProcessing: true,
			hasLiveMatches: true,
			hasUpcomingMatches: true,
			hasRecentlyFinished: true,
			needsFinishCheck: true
		};
	}
}

// Intelligent processor task - handles leaderboard recalculation and general maintenance
// NOTE: Prediction processing is handled by finished-fixtures-checker immediately when matches finish
export const intelligentProcessor = schedules.task({
	id: 'intelligent-processor',
	cron: '*/15 * * * *', // Every 15 minutes (was 5 - too frequent since finished-fixtures-checker handles predictions)
	run: async (payload) => {
		console.log('🤖 Intelligent processor: Running leaderboard maintenance...');

		const activity = await checkMatchActivity();

		// Only run if there was recent match activity (leaderboards might need updating)
		if (!activity.hasRecentlyFinished && !activity.hasLiveMatches) {
			console.log('✅ No recent matches - leaderboards should be current, skipping');
			return { skipped: true, reason: 'no-recent-match-activity' };
		}

		console.log('📊 Recent match activity - checking if leaderboards need updating');
		const baseUrl = getBaseUrl();

		const requestPayload = {
			job: 'auto',
			force: false
		};

		const response = await fetch(`${baseUrl}/api/cron/intelligent-processor`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Intelligent processor failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Intelligent processor completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Fixture schedule task - checks for schedule changes
// Runs once per day (schedule changes are rare)
export const fixtureSchedule = schedules.task({
	id: 'fixture-schedule',
	cron: '0 8 * * *', // Once per day at 8 AM UTC (schedule changes are very rare!)
	run: async (payload) => {
		console.log('Running scheduled fixture schedule task');
		console.log('Scheduled for:', payload.timestamp);
		console.log('Last run:', payload.lastTimestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			organization: 'premierleague',
			force: false,
			priority: 'normal',
			action: 'update_fixtures'
		};

		const response = await fetch(`${baseUrl}/api/cron/fixture-schedule`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Fixture schedule failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Fixture schedule completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Simple coordinate task - lightweight coordinator
export const simpleCoordinate = schedules.task({
	id: 'simple-coordinate',
	cron: '*/15 * * * *', // Every 15 minutes (was every 10 minutes)
	run: async (payload) => {
		console.log('Running scheduled simple coordinate task');
		console.log('Scheduled for:', payload.timestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			action: 'status',
			jobName: 'background-maintenance',
			intervalMinutes: 10
		};

		const response = await fetch(`${baseUrl}/api/cron/simple-coordinate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Simple coordinate failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Simple coordinate completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Health check task - monitors system health
export const healthCheck = schedules.task({
	id: 'health-check',
	cron: '*/30 * * * *', // Every 30 minutes (was every 5 minutes - too frequent!)
	run: async (payload) => {
		console.log('Running scheduled health check task');
		console.log('Scheduled for:', payload.timestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// For scheduled health checks, just get the health status via GET
		const response = await fetch(`${baseUrl}/api/cron/health`, {
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error(`Health check failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Health check completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Finished fixtures checker - verifies and processes completed matches
export const finishedFixturesChecker = schedules.task({
	id: 'finished-fixtures-checker',
	cron: '*/10 * * * *', // Every 10 minutes - checks for matches that need verification
	run: async (payload) => {
		console.log('🏁 Finished fixtures: Checking for completed matches...');

		const activity = await checkMatchActivity();

		// Run if there are recently finished matches OR matches that should be finished
		if (!activity.hasRecentlyFinished && !activity.needsFinishCheck) {
			console.log('✅ No finished matches to verify - skipping');
			return { skipped: true, reason: 'no-finished-matches' };
		}

		if (activity.hasRecentlyFinished) {
			console.log('🏁 Recently finished matches found - verifying and processing predictions');
		}
		if (activity.needsFinishCheck) {
			console.log('⏳ Matches should be finished - checking status (might be in extra time)');
		}

		const baseUrl = getBaseUrl();

		const response = await fetch(`${baseUrl}/api/cron/finished-fixtures-checker`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Finished fixtures checker failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Finished fixtures checker completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Live scores updater - updates scores for matches currently in play
export const liveScoresUpdater = schedules.task({
	id: 'live-scores-updater',
	cron: '*/3 * * * *', // Every 3 minutes - checks for ACTUAL live matches first
	run: async (payload) => {
		console.log('⚽ Live scores: Checking for live matches...');

		const activity = await checkMatchActivity();

		// Only run if there are actually live matches OR matches that should be live
		if (!activity.hasLiveMatches) {
			console.log('✅ No live matches - skipping');
			return { skipped: true, reason: 'no-live-matches' };
		}

		console.log('🔴 LIVE matches detected - updating scores');
		const baseUrl = getBaseUrl();

		const response = await fetch(`${baseUrl}/api/cron/live-scores-updater`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Live scores updater failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Live scores updater completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Prediction reminder task - sends email reminders to users with missing predictions
// Runs Friday 10 AM and Saturday 10 AM UTC (before typical Premier League kickoffs)
export const predictionReminder = schedules.task({
	id: 'prediction-reminder',
	cron: '0 10 * * 5,6', // Friday and Saturday at 10 AM UTC
	run: async (payload) => {
		console.log('📧 Running scheduled prediction reminder task');
		console.log('Scheduled for:', payload.timestamp);
		console.log('Last run:', payload.lastTimestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const response = await fetch(`${baseUrl}/api/cron/prediction-reminders`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ force: false })
		});

		if (!response.ok) {
			throw new Error(`Prediction reminder failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('📧 Prediction reminder completed:', result);

		// Log summary
		if (result.sent !== undefined) {
			console.log(`✉️ Reminders sent: ${result.sent}, failed: ${result.failed || 0}`);
		} else if (result.skipped) {
			console.log(`⏭️ Skipped: ${result.reason}`);
		}

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Prediction safety check task - runs every 6 hours to catch missed predictions
export const predictionSafetyCheck = schedules.task({
	id: 'prediction-safety-check',
	cron: '0 */6 * * *', // Every 6 hours
	run: async (payload) => {
		console.log('🛡️ Running scheduled prediction safety check task');
		console.log('Scheduled for:', payload.timestamp);
		console.log('Last run:', payload.lastTimestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			daysBack: 7, // Check last 7 days
			force: false
		};

		const response = await fetch(`${baseUrl}/api/cron/prediction-safety-check`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Prediction safety check failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('🛡️ Prediction safety check completed:', result);

		// Log important results
		if (result.result) {
			console.log(
				`📊 Safety check: ${result.result.fixturesChecked} fixtures checked, ${result.result.predictionsFixed} predictions fixed, ${result.result.pointsAwarded} points awarded`
			);

			if (result.result.errors?.length > 0) {
				console.error(`⚠️ Safety check errors:`, result.result.errors);
			}
		}

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});

// Leaderboard integrity check - verifies points match between predictions and leaderboard
// This catches any drift caused by bugs like the multiplier issue
export const leaderboardIntegrityCheck = schedules.task({
	id: 'leaderboard-integrity-check',
	cron: '0 4 * * *', // Daily at 4 AM UTC (quiet time, after all matches)
	run: async (payload) => {
		console.log('🔍 Running leaderboard integrity check...');
		console.log('Scheduled for:', payload.timestamp);
		console.log('Last run:', payload.lastTimestamp);

		const baseUrl = getBaseUrl();

		const requestPayload = {
			autoFix: true, // Automatically fix any mismatches
			threshold: 0 // Alert on any difference
		};

		const response = await fetch(`${baseUrl}/api/cron/leaderboard-integrity-check`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Leaderboard integrity check failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('🔍 Leaderboard integrity check completed:', result);

		// Log summary
		if (result.mismatches?.length > 0) {
			console.warn(
				`⚠️ Found ${result.mismatches.length} point mismatches! Auto-fixed: ${result.fixedCount} orgs`
			);
			// Log details of mismatches for debugging
			for (const mismatch of result.mismatches.slice(0, 5)) {
				console.warn(
					`   User ${mismatch.userId}: expected ${mismatch.expectedPoints}, got ${mismatch.actualPoints} (diff: ${mismatch.difference})`
				);
			}
		} else {
			console.log('✅ All leaderboard points match prediction totals');
		}

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});
