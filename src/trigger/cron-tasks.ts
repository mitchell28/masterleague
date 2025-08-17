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

// Background processing task - replaces /api/background cron (every 5 minutes)
export const backgroundProcessing = task({
	id: 'background-processing',
	run: async (payload: {
		action?: string;
		organizationId?: string;
		season?: string;
		fixtureId?: string;
		force?: boolean;
	}) => {
		console.log('Running background processing task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// Default to 'update-predictions' if no action specified
		const requestPayload = {
			action: payload.action || 'update-predictions',
			organizationId: payload.organizationId,
			season: payload.season || '2025-26',
			fixtureId: payload.fixtureId,
			force: payload.force || false
		};

		// Call your existing API endpoint
		const response = await fetch(`${baseUrl}/api/background`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-cron-secret': process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || ''
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Background processing failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Background processing completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			result
		};
	}
});

// Predictions update task - replaces /api/cron/predictions-update (every 2 minutes)
export const predictionsUpdate = task({
	id: 'predictions-update',
	run: async (payload: { organizationId?: string; force?: boolean; priority?: string }) => {
		console.log('Running predictions update task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// Build query parameters
		const params = new URLSearchParams();
		if (payload.organizationId) params.set('organizationId', payload.organizationId);
		if (payload.force) params.set('force', 'true');
		if (payload.priority) params.set('priority', payload.priority);

		const url = `${baseUrl}/api/cron/predictions-update${params.toString() ? '?' + params.toString() : ''}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET}`
			}
		});

		if (!response.ok) {
			throw new Error(`Predictions update failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Predictions update completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			result
		};
	}
});

// Cron coordination task - replaces /api/cron/coordinate (every 10 minutes)
export const cronCoordinate = task({
	id: 'cron-coordinate',
	run: async (payload: {
		action?: string;
		lockType?: string;
		identifier?: string;
		jobType?: string;
		intervalMinutes?: number;
	}) => {
		console.log('Running cron coordination task');

		const baseUrl = getBaseUrl();
		console.log('Using base URL:', baseUrl);

		// Default to 'should_run' action if no action specified
		const requestPayload = {
			action: payload.action || 'should_run',
			lockType: payload.lockType,
			identifier: payload.identifier,
			jobType: payload.jobType || 'background-maintenance',
			intervalMinutes: payload.intervalMinutes || 10
		};

		const response = await fetch(`${baseUrl}/api/cron/coordinate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET}`
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			throw new Error(`Cron coordination failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log('Cron coordination completed:', result);

		return {
			success: true,
			timestamp: new Date().toISOString(),
			result
		};
	}
});
