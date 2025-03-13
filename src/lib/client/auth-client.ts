import { createAuthClient } from 'better-auth/svelte';
import { adminClient } from 'better-auth/client/plugins';

// Create and export the auth client
export const authClient = createAuthClient({
	// Base URL configuration
	baseURL: 'http://localhost:5173', // the base url of your auth server

	// Add client-side plugins
	plugins: [
		// Add the admin client plugin with minimal configuration
		// Note: The full configuration will be determined by the server-side setup
		adminClient()
	]
});

// Export types
export type AuthClient = typeof authClient;
