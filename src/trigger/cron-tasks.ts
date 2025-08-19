import { task } from '@trigger.dev/sdk';

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
export const intelligentProcessor = task({
	id: 'intelligent-processor',
	maxDuration: 120, // 2 minutes - quick background processing
	run: async (payload: { job?: string; force?: boolean }) => {
		console.log('Running intelligent processor task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			job: payload.job || 'auto',
			force: payload.force || false
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
			result
		};
	}
});

// Fixture schedule task - replaces predictions update (every 2 minutes)
export const fixtureSchedule = task({
	id: 'fixture-schedule',
	maxDuration: 180, // 3 minutes - allows for API calls with delays
	run: async (payload: {
		organization?: string;
		force?: boolean;
		priority?: string;
		action?: string;
	}) => {
		console.log('Running fixture schedule task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			organization: payload.organization || 'premierleague',
			force: payload.force || false,
			priority: payload.priority || 'normal',
			action: payload.action || 'update_fixtures'
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
			result
		};
	}
});

// Simple coordinate task - replaces cron coordination (every 10 minutes)
export const simpleCoordinate = task({
	id: 'simple-coordinate',
	maxDuration: 60, // 1 minute - coordination should be fast
	run: async (payload: { action?: string; jobName?: string; intervalMinutes?: number }) => {
		console.log('Running simple coordinate task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			action: payload.action || 'status',
			jobName: payload.jobName || 'background-maintenance',
			intervalMinutes: payload.intervalMinutes || 10
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
			result
		};
	}
});

// Health check task - monitors system health (every 5 minutes)
export const healthCheck = task({
	id: 'health-check',
	maxDuration: 30, // 30 seconds - health checks should be fast
	run: async (payload: { jobType?: string; detailed?: boolean }) => {
		console.log('Running health check task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// If no specific jobType provided, just get the health status via GET
		if (!payload.jobType) {
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
				result
			};
		}

		// If specific jobType provided, update its health status
		const requestPayload = {
			jobType: payload.jobType,
			success: true, // Health check task itself succeeded
			duration: 100, // Minimal duration for health check
			itemsProcessed: 1,
			errors: []
		};

		const response = await fetch(`${baseUrl}/api/cron/health`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Health check failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Health check completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			result
		};
	}
});

// Finished fixtures checker task - checks finished fixtures missing scores (every 30 minutes)
export const finishedFixturesChecker = task({
	id: 'finished-fixtures-checker',
	maxDuration: 240, // 4 minutes - allows for multiple API calls
	run: async (payload: {
		hoursBack?: number;
		maxFixtures?: number;
		force?: boolean;
		priority?: string;
	}) => {
		console.log('Running finished fixtures checker task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		const requestPayload = {
			hoursBack: payload.hoursBack || 6,
			maxFixtures: payload.maxFixtures || 20,
			force: payload.force || false,
			priority: payload.priority || 'normal'
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
			result
		};
	}
});

// Live scores updater task - smart cron-optimized live game score updates
export const liveScoresUpdater = task({
	id: 'live-scores-updater',
	maxDuration: 300, // 5 minutes - longest running task for live updates
	run: async (payload: {
		priority?: 'urgent' | 'normal';
		force?: boolean;
		cronFrequencyMinutes?: number;
	}) => {
		console.log('🚀 Running smart live scores updater task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// Smart payload - let the API handle time window calculations
		const requestPayload = {
			priority: payload.priority || 'normal',
			force: payload.force || false,
			// Optional: tell API how frequently this cron runs for optimal time windows
			cronFrequency: payload.cronFrequencyMinutes || 60 // Default 60 minutes (hourly)
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
			result
		};
	}
});
