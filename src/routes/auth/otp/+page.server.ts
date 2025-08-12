import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/db/auth/auth';
import type { Actions } from '@sveltejs/kit';

// Schema for email validation
const emailSchema = z.object({
	email: z.string().email('Please enter a valid email address')
});

// Schema for OTP verification
const otpSchema = z.object({
	email: z.string().email(),
	otp: z.string().length(6, 'OTP must be exactly 6 digits')
});

export const actions: Actions = {
	// Action to request OTP - checks if user exists first
	requestOtp: async ({ request }) => {
		const form = await superValidate(request, zod(emailSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { email } = form.data;

		try {
			// Check if user exists in database
			const existingUser = await db
				.select({ id: authUser.id, emailVerified: authUser.emailVerified })
				.from(authUser)
				.where(eq(authUser.email, email))
				.limit(1);

			if (existingUser.length === 0) {
				// Don't reveal that the email doesn't exist for security
				// Instead return a generic message but don't actually send OTP
				return fail(400, {
					form: {
						...form,
						message: 'If this email is registered, you will receive a verification code shortly.'
					}
				});
			}

			// User exists, send OTP using Better Auth
			const result = await auth.api.sendVerificationOTP({
				body: {
					email,
					type: 'sign-in'
				}
			});

			if (!result) {
				return fail(500, {
					form: {
						...form,
						message: 'Failed to send verification code. Please try again.'
					}
				});
			}

			return {
				form: {
					...form,
					message: `Verification code sent to ${email}`
				}
			};
		} catch (error) {
			console.error('Failed to send OTP:', error);
			return fail(500, {
				form: {
					...form,
					message: 'Failed to send verification code. Please try again.'
				}
			});
		}
	},

	// Action to verify OTP and sign in
	verifyOtp: async ({ request, cookies }) => {
		const form = await superValidate(request, zod(otpSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { email, otp } = form.data;

		try {
			// Verify OTP using Better Auth
			const result = await auth.api.signInEmailOTP({
				body: {
					email,
					otp
				}
			});

			if (!result) {
				return fail(400, {
					form: {
						...form,
						message: 'Invalid verification code. Please try again.'
					}
				});
			}

			// Redirect to predictions page on success
			throw redirect(302, '/predictions');
		} catch (error) {
			console.error('Failed to verify OTP:', error);
			return fail(400, {
				form: {
					...form,
					message: 'Invalid verification code. Please try again.'
				}
			});
		}
	}
};
