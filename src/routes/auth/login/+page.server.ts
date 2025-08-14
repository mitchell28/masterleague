import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authLoginSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad, Actions } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import auth from '$lib/server/db/auth/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
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

export const actions: Actions = {
	default: async ({ request, url, cookies, getClientAddress }) => {
		const form = await superValidate(request, zod(authLoginSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Prepare headers with client IP for rate limiting
			const headers = new Headers(request.headers);
			const clientIP = getClientAddress();
			if (clientIP) {
				headers.set('x-forwarded-for', clientIP);
			}

			console.log(`🔄 [Login] Attempting login for email: ${form.data.email}`);

			// Attempt login with Better Auth
			await auth.api.signInEmail({
				body: {
					email: form.data.email,
					password: form.data.password,
					rememberMe: true,
					callbackURL: undefined // Don't use callbackURL, handle redirect manually
				},
				headers: headers
			});

			console.log(`✅ [Login] Login successful for email: ${form.data.email}`);

			// If we reach here, login was successful - redirect to predictions
			throw redirect(302, '/predictions');
		} catch (error: any) {
			console.error('❌ [Login] Login failed:', error);

			// Handle redirect errors (from redirect calls)
			if (error?.status === 302) {
				console.log(`🔄 [Login] Handling redirect`);
				throw error;
			}

			// Handle Better Auth APIError
			if (error instanceof APIError) {
				console.log(`[Login] APIError: ${error.message}, Status: ${error.status}`);

				// Handle email verification requirement
				if (error.body?.code === 'EMAIL_NOT_VERIFIED') {
					console.log(`📧 [Login] Email verification required for: ${form.data.email}`);
					throw redirect(
						302,
						`/auth/verify-email?email=${encodeURIComponent(form.data.email)}&from=login`
					);
				}

				// Handle rate limiting
				if (error.body?.code === 'TOO_MANY_REQUESTS') {
					console.log(`[Login] Returning rate limit error`);
					form.message = 'Too many login attempts. Please wait and try again.';
					return fail(429, { form });
				}

				// Handle invalid credentials
				if (error.body?.code === 'INVALID_EMAIL_OR_PASSWORD') {
					console.log(`[Login] Returning invalid credentials error`);
					// Try the approach recommended in Superforms docs
					form.message = 'Invalid email or password. Please check your credentials and try again.';
					const failResult = fail(401, { form });
					console.log(`[Login] Fail result:`, JSON.stringify(failResult, null, 2));
					return failResult;
				}

				// Handle other API errors
				console.log(`[Login] Returning generic API error`);
				form.message = error.message || 'Login failed. Please try again.';
				return fail(500, { form });
			}

			// Fallback for non-APIError instances
			console.log(`[Login] Non-APIError instance, returning generic error`);
			form.message = 'Login failed. Please try again.';
			return fail(500, { form });
		}
	}
};
