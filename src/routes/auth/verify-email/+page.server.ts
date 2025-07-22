import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { emailVerificationSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email') || '';

	return {
		form: await superValidate({ email }, zod(emailVerificationSchema)),
		email
	};
};
