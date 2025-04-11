import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	const redirectPath = '/predictions';

	if (session) {
		return redirect(302, redirectPath);
	}

	// Also used on client signin page as callbackURL
	console.log('Session not found, redirecting to login page', redirectPath);
	return {
		redirectPath
	};
};
