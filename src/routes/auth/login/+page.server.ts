import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authLoginSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const user = locals.user;

	if (session) {
		if (!user.emailVerified) {
			// Preserve email parameter if it exists in the current URL, otherwise use user's email
			const emailParam = url.searchParams.get('email');
			const redirectUrl = emailParam
				? `/auth/verify-email?email=${encodeURIComponent(emailParam)}`
				: `/auth/verify-email?email=${encodeURIComponent(user.email)}`;
			throw redirect(302, redirectUrl);
		}
		// If user has a session and email is verified, redirect to predictions
		throw redirect(302, '/predictions');
	}

	// Meta tags for login page
	const pageMetaTags = Object.freeze({
		title: 'Login',
		description:
			'Sign in to your Master League account to access your prediction groups, view leaderboards, and make predictions.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'noindex,nofollow', // Don't index login pages
		openGraph: {
			title: 'Login - Master League',
			description:
				'Sign in to your Master League account to access your prediction groups, view leaderboards, and make predictions.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Login - Master League',
			description:
				'Sign in to your Master League account to access your prediction groups and make predictions.'
		}
	}) satisfies MetaTagsProps;

	return {
		form: await superValidate(zod(authLoginSchema)),
		pageMetaTags,
		verified
	};
};
