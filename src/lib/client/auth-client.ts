import { createAuthClient } from 'better-auth/svelte';
import { adminClient } from 'better-auth/client/plugins';
import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';
import { invalidate } from '$app/navigation';

// Create and export the auth client
export const authClient = createAuthClient({
	baseURL: PUBLIC_BETTER_AUTH_URL,
	plugins: [adminClient()]
});

// Create a wrapper for sign out that also invalidates app state
export async function signOut() {
	await authClient.signOut();
	// After sign out completes, invalidate auth-dependent data
	await invalidate('app:auth');
}

// Create a wrapper for sign in that also invalidates app state
export async function signIn(
	credentials: { email: string; password: string },
	callbacks?: {
		onRequest?: () => void;
		onSuccess?: () => void;
		onError?: (ctx: { error: { message: string } }) => void;
	}
) {
	return authClient.signIn.email(credentials, {
		onRequest: callbacks?.onRequest,
		onSuccess: async () => {
			// After sign in completes, invalidate auth-dependent data
			await invalidate('app:auth');
			callbacks?.onSuccess?.();
		},
		onError: callbacks?.onError
	});
}

// Create a wrapper for sign up that also invalidates app state
export async function signUp(
	credentials: {
		email: string;
		password: string;
		name: string;
		callbackURL?: string;
	},
	callbacks?: {
		onRequest?: () => void;
		onSuccess?: () => void;
		onError?: (ctx: { error: { message: string } }) => void;
	}
) {
	return authClient.signUp.email(credentials, {
		onRequest: callbacks?.onRequest,
		onSuccess: async () => {
			// After sign up completes, invalidate auth-dependent data
			await invalidate('app:auth');
			callbacks?.onSuccess?.();
		},
		onError: callbacks?.onError
	});
}

// Export types
export type AuthClient = typeof authClient;
