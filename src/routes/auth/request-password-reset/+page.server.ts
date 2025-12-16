import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { otpRequestSchema } from '$lib/validation/auth-schemas';
import type { PageServerLoad, Actions } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import auth from '$lib/server/db/auth/auth';
import { APIError } from 'better-auth/api';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(302, '/predictions');
	}

	// Check for success state
	const success = url.searchParams.get('success') === 'true';
	const email = url.searchParams.get('email');

	// Meta tags for password reset page
	const pageMetaTags = Object.freeze({
		title: 'Request to Reset Password',
		description:
			'Request to Reset your Master League account password to regain access to your prediction groups and leaderboards.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'noindex,nofollow', // Don't index password reset pages
		openGraph: {
			title: 'Request to Reset Password - Master League',
			description:
				'Request to Reset your Master League account password to regain access to your prediction groups and leaderboards.',
			url: new URL(url.pathname, url.origin).href
		},
		twitter: {
			title: 'Request to Reset Password - Master League',
			description:
				'Request to Reset your Master League account password to regain access to your prediction groups and leaderboards.'
		}
	}) satisfies MetaTagsProps;

	return {
		form: await superValidate(zod4(otpRequestSchema)),
		pageMetaTags,
		success,
		email
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		console.log(`🔄 [Password Reset] Request received`);
		const form = await superValidate(request, zod4(otpRequestSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// First, check if the user exists
			const existingUser = await db
				.select({ id: user.id, email: user.email, emailVerified: user.emailVerified })
				.from(user)
				.where(eq(user.email, form.data.email))
				.limit(1);

			if (!existingUser.length) {
				console.log(`📧 [Password Reset] Email not found: ${form.data.email}`);
				form.message =
					'If an account with this email exists, you will receive a password reset link.';
				return fail(404, { form });
			}

			// Check if email is verified
			if (!existingUser[0].emailVerified) {
				console.log(`📧 [Password Reset] Email not verified: ${form.data.email}`);
				form.message = 'Please verify your email address before requesting a password reset.';
				return fail(400, { form });
			}

			const headers = new Headers(request.headers);
			const clientIP = getClientAddress();
			if (clientIP) {
				headers.set('x-forwarded-for', clientIP);
			}

			await auth.api.requestPasswordReset({
				body: {
					email: form.data.email,
					redirectTo: `${new URL(request.url).origin}/auth/password-reset`
				},
				headers
			});

			console.log(`✅ [Password Reset] Reset email sent to: ${form.data.email}`);

			// Redirect to success page or show success message
			throw redirect(
				302,
				`/auth/request-password-reset?success=true&email=${encodeURIComponent(form.data.email)}`
			);
		} catch (error: any) {
			// Handle redirect errors (from redirect calls)
			if (error?.status === 302) {
				console.log(`🔄 [Password Reset] Handling redirect`);
				throw error;
			}

			// Handle Better Auth APIError
			if (error instanceof APIError) {
				console.log(`❌ [Password Reset] APIError: ${error.message}, Status: ${error.status}`);

				// Handle rate limiting
				if (error.body?.code === 'TOO_MANY_REQUESTS') {
					console.log(`⏰ [Password Reset] Rate limit exceeded for: ${form.data.email}`);
					form.message = 'Too many password reset requests. Please wait before trying again.';
					return fail(429, { form });
				}

				// Handle other specific Better Auth errors
				if (error.body?.code === 'USER_NOT_FOUND') {
					console.log(`👤 [Password Reset] User not found: ${form.data.email}`);
					form.message =
						'If an account with this email exists, you will receive a password reset link.';
					return fail(404, { form });
				}

				// Handle other API errors
				console.log(`🔥 [Password Reset] Unexpected API error: ${error.message}`);
				form.message = 'Failed to send password reset email. Please try again later.';
				return fail(500, { form });
			}

			// Fallback for non-APIError instances
			console.log(`💥 [Password Reset] Unexpected error:`, error);
			form.message = 'Failed to send password reset email. Please try again later.';
			return fail(500, { form });
		}
	}
};
