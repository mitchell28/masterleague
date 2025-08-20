import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		throw redirect(302, '/predictions');
	}
};
