import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { otpVerifySchema } from '$lib/validation/auth-schemas';
import { checkEmailStatus } from '$lib/server/utils/auth-checks';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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

export const actions: Actions = {
	checkEmail: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) {
			return fail(400, { error: 'Email is required' });
		}

		try {
			const { exists } = await checkEmailStatus(email);

			if (!exists) {
				return fail(404, {
					error: `No account found with email ${email}. Please sign up first or check your email address.`,
					exists: false
				});
			}

			return { email, exists: true };
		} catch (error) {
			console.error('Email check failed:', error);
			return fail(500, { error: 'Failed to verify email' });
		}
	}
};
