import { auth } from '$lib/server/db/auth/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';

// import { createRequestHandler, setServerClient } from '@sanity/svelte-loader';
// import { serverClient } from '$lib/sanity/server/client';

// setServerClient(serverClient);
// const sanityHandler = createRequestHandler();

const authHandler: Handle = async ({ event, resolve }) => {
	try {
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		event.locals.session = session?.session;
		event.locals.user = session?.user;
	} catch (error) {
		console.error('❌ [Auth] Session error in hooks:', error);
		event.locals.session = null;
		event.locals.user = null;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = authHandler; // sequence(authHandler, sanityHandler);
