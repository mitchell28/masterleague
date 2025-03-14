import { auth } from '$lib/server/db/auth/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	const redirectPath = '/predictions';

	if (session) {
		redirect(302, redirectPath);
	}

	// Also used on client signin page as callbackURL
	return {
		redirectPath
	};
};
