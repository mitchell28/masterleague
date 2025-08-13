import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authSignupSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const user = locals.user;

	if (session && user) {
		// If user has a session but email is not verified, redirect to verify-email
		if (!user.emailVerified) {
			throw redirect(302, '/auth/verify-email');
		}
		// If user has a session and email is verified, redirect to predictions
		throw redirect(302, '/predictions');
	}

	// Meta tags for signup page
	const pageMetaTags = Object.freeze({
		title: 'Sign Up',
		description:
			'Join Master League today! Create your free account to start making predictions, join groups, and compete with friends in exciting sports leagues.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			title: 'Sign Up - Master League',
			description:
				'Join Master League today! Create your free account to start making predictions, join groups, and compete with friends in exciting sports leagues.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Sign Up - Master League',
			description:
				'Join Master League today! Create your free account to start making predictions and compete with friends.'
		}
	}) satisfies MetaTagsProps;

	return {
		form: await superValidate(zod(authSignupSchema)),
		pageMetaTags
	};
};
