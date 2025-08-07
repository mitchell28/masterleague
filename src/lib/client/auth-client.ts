import { createAuthClient } from 'better-auth/svelte';
import {
	adminClient,
	usernameClient,
	emailOTPClient,
	organizationClient
} from 'better-auth/client/plugins';
import { stripeClient } from '@better-auth/stripe/client';
import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';

// Create and export the auth client
export const authClient = createAuthClient({
	baseURL: PUBLIC_BETTER_AUTH_URL,
	plugins: [
		adminClient(),
		usernameClient(),
		emailOTPClient(),
		organizationClient(),
		stripeClient({
			subscription: true // Enable subscription management
		})
	],
	fetchOptions: {
		onError: async (context) => {
			const { response } = context;
			console.error(`🚨 [Auth Client] Request failed:`, {
				status: response.status,
				statusText: response.statusText,
				url: response.url
			});

			// Handle rate limiting globally
			if (response.status === 429) {
				const retryAfter = response.headers.get('X-Retry-After');
				console.warn(`🚫 [Auth Client] Rate limit exceeded. Retry after ${retryAfter} seconds`);
				// You could show a toast notification here
			}

			// Handle other common errors
			if (response.status >= 500) {
				console.error(`🚨 [Auth Client] Server error (${response.status})`);
			} else if (response.status === 400) {
				console.error(`🚨 [Auth Client] Bad request (${response.status})`);
			}

			// Try to get response body for more details
			try {
				const errorBody = await response.text();
				console.error(`🚨 [Auth Client] Error response body:`, errorBody);
			} catch (e) {
				console.error(`🚨 [Auth Client] Could not read error response body`);
			}
		}
	}
});

// Export types
export type AuthClient = typeof authClient;
