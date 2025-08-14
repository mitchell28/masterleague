import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { emailVerificationSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import { auth } from '$lib/server/db/auth/auth'; // Adjust import based on your project structure

export const load: PageServerLoad = async ({ locals, url, request }) => {
	const email = url.searchParams.get('email') || '';
	const fromLogin = url.searchParams.get('from') === 'login';

	// If user is already authenticated and email is verified, redirect to predictions
	if (locals.session && locals.user?.emailVerified) {
		throw redirect(302, '/predictions');
	}

	// Auto-send verification code when redirected from login (server-side, runs only once)
	let codeSent = false;
	if (fromLogin && email) {
		try {
			await auth.api.sendVerificationEmail({
				body: {
					email
				},
				headers: request.headers
			});
			codeSent = true;
		} catch (error) {
			console.error('Failed to send verification OTP on login redirect:', error);
			// Don't throw - let the page handle it gracefully
		}
	}

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
		fromLogin,
		codeSent,
		pageMetaTags
	};
};
