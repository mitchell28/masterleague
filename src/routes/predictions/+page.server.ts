import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Main route now just redirects to the appropriate week
export const load: PageServerLoad = async ({ url, parent }) => {
	// Get parent data which contains authentication info and week data
	const { currentWeek } = await parent();

	// Get week from URL or use current week
	const requestedWeek = url.searchParams.get('week');
	const week = requestedWeek ? parseInt(requestedWeek) : currentWeek;

	// Redirect to the dynamic week route
	throw redirect(302, `/predictions/${week}`);
};
