import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// Redirect to the first blog post
	throw redirect(302, '/blog/launch-annoucment');
};
