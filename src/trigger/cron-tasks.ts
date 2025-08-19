import { schedules } from '@trigger.dev/sdk';

// Helper function to get the base URL
function getBaseUrl(): string {
	// In production, try ORIGIN first (for deployed environments)
	if (process.env.ORIGIN) {
		return process.env.ORIGIN;
	}

	// Fallback to PUBLIC_BETTER_AUTH_URL (works in development)
	if (process.env.PUBLIC_BETTER_AUTH_URL) {
		return process.env.PUBLIC_BETTER_AUTH_URL;
	}

	// Last fallback for development
	return 'https://masterleague.app';
}

// Intelligent processor task - replaces old background processing (every 30 seconds)
export const intelligentProcessor = schedules.task({
	id: 'intelligent-processor',
	cron: '*/30 * * * * *', // Every 30 seconds
	run: async (payload) => {
		console.log('Running scheduled intelligent processor task');
		console.log('Scheduled for:', payload.timestamp);
		console.log('Last run:', payload.lastTimestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

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

// Fixture schedule task - replaces predictions update (every 2 minutes)
export const fixtureSchedule = schedules.task({
	id: 'fixture-schedule',
	cron: '*/2 * * * *', // Every 2 minutes
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

// Simple coordinate task - replaces cron coordination (every 10 minutes)
export const simpleCoordinate = schedules.task({
	id: 'simple-coordinate',
	cron: '*/10 * * * *', // Every 10 minutes
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

// Health check task - monitors system health (every 5 minutes)
export const healthCheck = schedules.task({
	id: 'health-check',
	cron: '*/5 * * * *', // Every 5 minutes
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

// Finished fixtures checker task - checks finished fixtures missing scores (every 30 minutes)
export const finishedFixturesChecker = schedules.task({
	id: 'finished-fixtures-checker',
	cron: '*/30 * * * *', // Every 30 minutes
	run: async (payload) => {
		console.log('Running scheduled finished fixtures checker task');
		console.log('Scheduled for:', payload.timestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			hoursBack: 6,
			maxFixtures: 20,
			force: false,
			priority: 'normal'
		};

		const response = await fetch(`${baseUrl}/api/cron/finished-fixtures-checker`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
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

// Live scores updater task - smart cron-optimized live game score updates
export const liveScoresUpdater = schedules.task({
	id: 'live-scores-updater',
	cron: '0 * * * *', // Every hour (top of the hour)
	run: async (payload) => {
		console.log('🚀 Running scheduled live scores updater task');
		console.log('Scheduled for:', payload.timestamp);
		console.log('Last run:', payload.lastTimestamp);

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// Smart payload - let the API handle time window calculations
		const requestPayload = {
			priority: 'normal',
			force: false,
			// Optional: tell API how frequently this cron runs for optimal time windows
			cronFrequency: 60 // Default 60 minutes (hourly)
		};

		const response = await fetch(`${baseUrl}/api/cron/live-scores-updater`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Live scores updater failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('⚽ Live scores updater completed:', result);

		// Enhanced logging for smart system
		if (result.checked !== undefined) {
			console.log(
				`📊 Smart update: checked ${result.checked} fixtures, updated ${result.updated || 0}`
			);
		}

		return {
			success: true,
			timestamp: new Date().toISOString(),
			scheduleId: payload.scheduleId,
			result
		};
	}
});
