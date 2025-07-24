import { createAuthClient } from 'better-auth/svelte';
import { adminClient, usernameClient, emailOTPClient } from 'better-auth/client/plugins';
import { stripeClient } from '@better-auth/stripe/client';
import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';

// Create and export the auth client
export const authClient = createAuthClient({
	baseURL: PUBLIC_BETTER_AUTH_URL,
	plugins: [
		adminClient(),
		usernameClient(),
		emailOTPClient(),
		stripeClient({
			subscription: true // Enable subscription management
		})
	],
	fetchOptions: {
		onError: async (context) => {
			const { response } = context;
			// Handle rate limiting globally
			if (response.status === 429) {
				const retryAfter = response.headers.get('X-Retry-After');
				console.warn(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
				// You could show a toast notification here
			}
		}
	}
});

// Export types
export type AuthClient = typeof authClient;
