import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authSignupSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	if (session) {
		redirect(302, '/predictions');
	}

	return {
		form: await superValidate(zod(authSignupSchema))
	};
};
