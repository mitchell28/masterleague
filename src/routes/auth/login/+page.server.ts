import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authLoginSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;

	if (session) {
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
		pageMetaTags
	};
};
