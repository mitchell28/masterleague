import { redirect } from '@sveltejs/kit';
import { getCurrentWeek } from '$lib/server/football/fixtures';
import type { PageServerLoad } from './$types';

// Main route now just redirects to the appropriate week
export const load: PageServerLoad = async ({ url, locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	// Get week from URL or use current week
	const requestedWeek = url.searchParams.get('week');
	const currentWeek = getCurrentWeek();
	const week = requestedWeek ? parseInt(requestedWeek) : currentWeek;

	// Redirect to the dynamic week route
	throw redirect(302, `/predictions/${week}`);
};
