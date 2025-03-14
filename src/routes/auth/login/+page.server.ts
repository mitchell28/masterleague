import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	const redirectPath = '/predictions';

	if (session) {
		redirect(302, redirectPath);
	}

	// Also used on client signin page as callbackURL
	return {
		redirectPath
	};
};
