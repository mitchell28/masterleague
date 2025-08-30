// Optimized API route with light caching and request deduplication
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { lightCache, requestDeduplicator } from '$lib/server/light-cache';

// Mock function - replace with actual implementation
async function getApiData(endpoint: string, params: any) {
	// Simulated API call
	await new Promise((resolve) => setTimeout(resolve, 100));
	return { endpoint, params, timestamp: Date.now() };
}

export const GET = async ({ url, locals }: RequestEvent) => {
	const endpoint = url.searchParams.get('endpoint');
	const userId = locals.user?.id;

	if (!endpoint) {
		return json({ error: 'Missing endpoint parameter' }, { status: 400 });
	}

	// Create cache key
	const cacheKey = `api:${endpoint}:${userId || 'anonymous'}`;

	// Check cache first (1 minute TTL for API responses)
	const cached = lightCache.fast.get(cacheKey);
	if (cached) {
		return json(cached, {
			headers: {
				'Cache-Control': 'public, max-age=30', // 30 seconds browser cache
				'X-Cache': 'HIT'
			}
		});
	}

	try {
		// Use request deduplication for concurrent requests
		const result = await requestDeduplicator.dedupe(cacheKey, async () => {
			const params = Object.fromEntries(url.searchParams.entries());
			return await getApiData(endpoint, params);
		});

		// Cache the result
		lightCache.fast.set(cacheKey, result, 60000); // 1 minute

		return json(result, {
			headers: {
				'Cache-Control': 'public, max-age=30',
				'X-Cache': 'MISS'
			}
		});
	} catch (error) {
		console.error('API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST = async ({ request, locals }: RequestEvent) => {
	const userId = locals.user?.id;

	if (!userId) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const action = body.action;

		// Deduplicate POST requests by user and action
		const dedupeKey = `post:${userId}:${action}:${JSON.stringify(body)}`;

		const result = await requestDeduplicator.dedupe(dedupeKey, async () => {
			// Process the action
			switch (action) {
				case 'update':
					// Mock update operation
					await new Promise((resolve) => setTimeout(resolve, 200));
					return { success: true, action, timestamp: Date.now() };

				default:
					throw new Error('Unknown action');
			}
		});

		// Invalidate related caches
		lightCache.fast.invalidateByPattern(new RegExp(`api:.*:${userId}`));

		return json(result);
	} catch (error: any) {
		console.error('POST API error:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
