import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { emailVerificationSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email') || '';

	// Meta tags for email verification page
	const pageMetaTags = Object.freeze({
		title: 'Verify Email',
		description:
			'Verify your email address to complete your Master League account setup and start making predictions.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'noindex,nofollow', // Don't index verification pages
		openGraph: {
			title: 'Verify Email - Master League',
			description:
				'Verify your email address to complete your Master League account setup and start making predictions.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Verify Email - Master League',
			description: 'Verify your email address to complete your account setup.'
		}
	}) satisfies MetaTagsProps;

	return {
		form: await superValidate({ email }, zod(emailVerificationSchema)),
		email,
		pageMetaTags
	};
};
