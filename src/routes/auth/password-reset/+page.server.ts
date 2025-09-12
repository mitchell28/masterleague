import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authResetPasswordSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad, Actions } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import auth from '$lib/server/db/auth/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(302, '/predictions');
	}

	// Check for success state
	const success = url.searchParams.get('success') === 'true';

	// Meta tags for password reset page
	const pageMetaTags = Object.freeze({
		title: 'Reset Password',
		description:
			'Reset your Master League account password to regain access to your prediction groups and leaderboards.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'noindex,nofollow', // Don't index password reset pages
		openGraph: {
			title: 'Reset Password - Master League',
			description:
				'Reset your Master League account password to regain access to your prediction groups and leaderboards.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Reset Password - Master League',
			description:
				'Reset your Master League account password to regain access to your prediction groups and leaderboards.'
		}
	}) satisfies MetaTagsProps;

	return {
		form: await superValidate(zod(authResetPasswordSchema)),
		pageMetaTags,
		success
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress, url }) => {
		console.log(`🔄 [Password Reset] received`);
		const form = await superValidate(request, zod(authResetPasswordSchema));
		const token = new URLSearchParams(url.searchParams).get('token');

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const headers = new Headers(request.headers);
			const clientIP = getClientAddress();
			if (clientIP) {
				headers.set('x-forwarded-for', clientIP);
			}

			const data = await auth.api.resetPassword({
				body: {
					newPassword: form.data.newPassword, // required
					token: token || '' // required
				}
			});

			console.log(`✅ [Password Reset] successful for user ID: ${data}`);

			// Redirect back to the same page with success parameter
			const resetUrl = new URL(request.url);
			resetUrl.searchParams.set('success', 'true');
			throw redirect(302, resetUrl.toString());
		} catch (error: any) {
			// Handle redirect errors (from redirect calls)
			if (error?.status === 302) {
				console.log(`🔄 [Login] Handling redirect`);
				throw error;
			}

			// Handle Better Auth APIError
			if (error instanceof APIError) {
				console.log(`[Login] APIError: ${error.message}, Status: ${error.status}`);

				// Handle rate limiting
				if (error.body?.code === 'TOO_MANY_REQUESTS') {
					console.log(`[Login] Returning rate limit error`);
					form.message = 'Too many login attempts. Please wait and try again.';
					return fail(429, { form });
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
