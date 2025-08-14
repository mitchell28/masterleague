import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authSignupSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad, Actions } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import auth from '$lib/server/db/auth/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(302, '/predictions');
	}

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

export const actions: Actions = {
	default: async ({ request, url, cookies, getClientAddress }) => {
		const form = await superValidate(request, zod(authSignupSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Create the full name from first and last name
			const fullName = `${form.data.firstName} ${form.data.lastName}`;

			// Prepare headers with client IP for rate limiting
			const headers = new Headers(request.headers);
			const clientIP = getClientAddress();
			if (clientIP) {
				headers.set('x-forwarded-for', clientIP);
			}

			console.log(`🔄 [Signup] Attempting signup for email: ${form.data.email}`);

			// Attempt signup with Better Auth
			await auth.api.signUpEmail({
				body: {
					email: form.data.email,
					password: form.data.password,
					name: fullName,
					image: undefined,
					callbackURL: undefined // Don't use callbackURL, handle redirect manually
				},
				headers: headers
			});

			console.log(`✅ [Signup] Signup successful for email: ${form.data.email}`);
		} catch (error: any) {
			console.error('❌ [Signup] Signup failed:', error);

			// Handle Better Auth APIError
			if (error instanceof APIError) {
				console.log(`[Signup] APIError: ${error.message}, Status: ${error.status}`);

				// Handle rate limiting
				if (error.body?.code === 'TOO_MANY_REQUESTS') {
					form.message = 'Too many signup attempts. Please wait a moment and try again.';
					return fail(429, { form });
				}

				// Handle user already exists
				if (error.body?.code === 'USER_ALREADY_EXISTS') {
					form.message =
						'An account with this email already exists. Please use a different email or try signing in.';
					return fail(422, { form });
				}

				// Handle other API errors
				form.message = error.message || 'Account creation failed. Please try again.';
				return fail(500, { form });
			}

			// Fallback for non-APIError instances
			form.message = 'Account creation failed. Please try again.';
			return fail(500, { form });
		}

		// If we reach here, signup was successful - redirect to verification
		console.log(`🔄 [Signup] Redirecting to verification for email: ${form.data.email}`);
		throw redirect(302, `/auth/verify-email?email=${encodeURIComponent(form.data.email)}`);
	}
};
