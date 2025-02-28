import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

export const load = async ({ locals, cookies }) => {
	// Check if user is logged in
	if (locals.session) {
		// Get the session ID
		const sessionId = locals.session.id;

		// Invalidate the session in the database
		await auth.invalidateSession(sessionId);

		// Delete the session cookie
		auth.deleteSessionTokenCookie({ cookies } as any);
	}

	// Redirect to the home page after sign out with reload
	throw redirect(303, '/');
};
