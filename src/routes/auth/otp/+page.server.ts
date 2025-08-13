import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { otpVerifySchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email') || '';

	// Meta tags for OTP verification page
	const pageMetaTags = Object.freeze({
		title: 'Verify Code',
		description: 'Enter your verification code to complete the login process for Master League.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'noindex,nofollow', // Don't index verification pages
		openGraph: {
			title: 'Verify Code - Master League',
			description: 'Enter your verification code to complete the login process for Master League.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Verify Code - Master League',
			description: 'Enter your verification code to complete the login process.'
		}
	}) satisfies MetaTagsProps;

	return {
		form: await superValidate({ email }, zod(otpVerifySchema)),
		email,
		pageMetaTags
	};
};
