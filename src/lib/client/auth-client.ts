import { createAuthClient } from 'better-auth/svelte';
import { adminClient, usernameClient, emailOTPClient } from 'better-auth/client/plugins';
import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';

// Create and export the auth client
export const authClient = createAuthClient({
	baseURL: PUBLIC_BETTER_AUTH_URL,
	plugins: [adminClient(), usernameClient(), emailOTPClient()]
});

// Export types
export type AuthClient = typeof authClient;
