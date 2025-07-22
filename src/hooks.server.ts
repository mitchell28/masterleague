import { auth } from '$lib/server/db/auth/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
	// Get the session first
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Set session and user to locals
	event.locals.session = session?.session;
	event.locals.user = session?.user;

	return svelteKitHandler({ event, resolve, auth, building });
};
