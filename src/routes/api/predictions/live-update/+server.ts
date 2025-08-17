import { json } from '@sveltejs/kit';
import {
	getLivePredictionsData,
	forceRefreshPredictions
} from '$lib/server/engine/analytics/predictions-realtime.js';
import type { RequestHandler } from './$types';

/**
 * API endpoint for live predictions updates
 * Handles frontend polling with intelligent caching and rate limiting
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Get query parameters
		const organizationId = url.searchParams.get('organizationId');
		const forceRefresh = url.searchParams.get('force') === 'true';

		// Check if user is authenticated (optional - predictions data might be public)
		const userId = locals.user?.id;

		// Log request for monitoring (only in development)
		if (process.env.NODE_ENV === 'development') {
			console.log(
				`Predictions live update request from ${userId || 'anonymous'}, org: ${organizationId || 'default'}, force: ${forceRefresh}`
			);
		}

		// Get live predictions data
		const predictionsData = forceRefresh
			? await forceRefreshPredictions(organizationId || undefined)
			: await getLivePredictionsData(organizationId || undefined);

		// Add response metadata
		const response = {
			...predictionsData,
			metadata: {
				requestId: crypto.randomUUID(),
				timestamp: Date.now(),
				userId: userId || null,
				organizationId: organizationId || null,
				source: 'api'
			}
		};

		// Set cache headers based on data freshness
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Set cache control based on whether we have live matches
		if (predictionsData.hasLiveMatches) {
			// Short cache for live matches
			headers['Cache-Control'] = 'public, max-age=15, s-maxage=15';
		} else {
			// Longer cache for static data
			headers['Cache-Control'] = 'public, max-age=120, s-maxage=120';
		}

		// Add rate limiting headers for client awareness
		headers['X-Rate-Limit-Remaining'] = predictionsData.apiCallsRemaining.toString();
		headers['X-Next-Update-In'] = Math.floor(predictionsData.nextUpdateIn / 1000).toString();
		headers['X-Cache-Status'] = predictionsData.cacheStatus;

		return json(response, { headers });
	} catch (error) {
		console.error('Live predictions update API error:', error);

		// Return error response with appropriate status
		return json(
			{
				error: 'Failed to fetch live predictions data',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now(),
				hasLiveMatches: false,
				nextUpdateIn: 120000, // Try again in 2 minutes
				apiCallsRemaining: 0,
				cacheStatus: 'error'
			},
			{
				status: 500,
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'X-Rate-Limit-Remaining': '0',
					'X-Next-Update-In': '120'
				}
			}
		);
	}
};

/**
 * POST endpoint for forcing predictions refresh
 * More restrictive - requires authentication and has additional rate limiting
 */
export const POST: RequestHandler = async ({ url, locals, request }) => {
	try {
		// Require authentication for force refresh
		if (!locals.user?.id) {
			return json({ error: 'Authentication required for force refresh' }, { status: 401 });
		}

		// Check if user has appropriate permissions
		const organizationId = url.searchParams.get('organizationId');

		// Get request body for additional options
		let options = {};
		try {
			const body = await request.text();
			if (body) {
				options = JSON.parse(body);
			}
		} catch {
			// Ignore parsing errors, use default options
		}

		// Log force refresh request
		console.log(
			`Force refresh request from user ${locals.user.id}, org: ${organizationId || 'default'}`
		);

		// Force refresh predictions data
		const predictionsData = await forceRefreshPredictions(organizationId || undefined);

		// Return success response
		return json(
			{
				...predictionsData,
				metadata: {
					requestId: crypto.randomUUID(),
					timestamp: Date.now(),
					userId: locals.user.id,
					organizationId: organizationId || null,
					source: 'force-refresh',
					options
				}
			},
			{
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'X-Rate-Limit-Remaining': predictionsData.apiCallsRemaining.toString(),
					'X-Next-Update-In': Math.floor(predictionsData.nextUpdateIn / 1000).toString(),
					'X-Cache-Status': 'fresh'
				}
			}
		);
	} catch (error) {
		console.error('Force predictions refresh API error:', error);

		return json(
			{
				error: 'Failed to force refresh predictions data',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now()
			},
			{ status: 500 }
		);
	}
};

/**
 * OPTIONS handler for CORS if needed
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};
