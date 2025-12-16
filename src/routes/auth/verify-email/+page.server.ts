import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import auth from '$lib/server/db/auth/auth';
import { otpRequestSchema, emailVerificationSchema } from '$lib/validation/auth-schemas';
import type { Actions, PageServerLoad } from './$types';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Redirect if user is already logged in and email is verified
	if (locals.user && locals.user.emailVerified) {
		throw redirect(302, '/predictions');
	}

	const email = url.searchParams.get('email');
	const codeSent = url.searchParams.get('codeSent') === 'true';

	// Initialize forms
	const requestForm = await superValidate(zod4(otpRequestSchema));
	const verifyForm = await superValidate(zod4(emailVerificationSchema));

	// Pre-populate email if provided
	if (email) {
		requestForm.data.email = email;
		verifyForm.data.email = email;
	}

	return {
		requestForm,
		verifyForm,
		email,
		codeSent
	};
};

export const actions: Actions = {
	sendOtp: async ({ request, getClientAddress }) => {
		const form = await superValidate(request, zod4(otpRequestSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const clientAddress = getClientAddress();

			// Send verification email via Better Auth
			const response = await auth.api.sendVerificationEmail({
				body: {
					email: form.data.email,
					callbackURL: '/auth/verify-email'
				},
				headers: {
					'x-forwarded-for': clientAddress
				}
			});

			if (!response) {
				return fail(400, {
					form,
					message: 'Failed to send verification email. Please try again.'
				});
			}

			// Redirect with success parameters
			throw redirect(
				302,
				`/auth/verify-email?email=${encodeURIComponent(form.data.email)}&codeSent=true`
			);
		} catch (error: any) {
			// Handle redirect
			if (error.status === 302) {
				throw error;
			}

			// Handle Better Auth APIError
			if (error instanceof APIError) {
				console.log(`[Send OTP] APIError: ${error.message}, Status: ${error.status}`);

				// Handle rate limiting
				if (error.body?.code === 'TOO_MANY_REQUESTS') {
					form.message = 'Too many requests. Please wait a moment and try again.';
					return fail(429, { form });
				}

				// Handle other API errors
				form.message = error.message || 'Failed to send verification email. Please try again.';
				return fail(500, { form });
			}

			console.error('Send OTP error:', error);
			form.message = 'Failed to send verification email. Please try again.';
			return fail(500, { form });
		}
	},

	verifyEmail: async ({ request, cookies }) => {
		const form = await superValidate(request, zod4(emailVerificationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Verify the email OTP on the server
			// @ts-ignore
			const { error } = await auth.api.verifyEmailOTP({
				body: {
					email: form.data.email,
					otp: form.data.otp
				},
				asResponse: false
			});

			if (error) {
				console.error('Email verification failed:', error);

				// Handle specific error codes
				if (error.message?.includes('Invalid OTP') || error.message?.includes('invalid')) {
					form.message = 'Invalid verification code. Please check your code and try again.';
					return fail(400, { form });
				}

				if (error.message?.includes('expired')) {
					form.message = 'Verification code has expired. Please request a new one.';
					return fail(400, { form });
				}

				// Handle already verified case
				if (
					error.message?.includes('already verified') ||
					error.message?.includes('already confirmed')
				) {
					console.log('📧 [Verify Email] Email already verified, proceeding with flow');
					// Don't fail here, proceed as if verification was successful
				} else {
					form.message = error.message || 'Verification failed. Please try again.';
					return fail(400, { form });
				}
			}

			console.log('✅ [Verify Email] Email verified successfully for:', form.data.email);

			// Check if we have signup credentials for auto-login
			if (
				form.data.signupEmail &&
				form.data.signupPassword &&
				form.data.signupEmail === form.data.email
			) {
				console.log('🔐 [Verify Email] Attempting auto-login after verification');

				try {
					// Attempt to sign in the user - Better Auth will handle setting cookies
					console.log('🔐 [Verify Email] Calling auth.api.signInEmail with:', {
						email: form.data.signupEmail
						// Don't log password for security
					});

					const signInResponse = await auth.api.signInEmail({
						body: {
							email: form.data.signupEmail,
							password: form.data.signupPassword
						},
						asResponse: true
					});

					console.log(
						'🔐 [Verify Email] Sign in response status:',
						signInResponse.status,
						signInResponse.statusText
					);

					if (!signInResponse.ok) {
						console.error('Auto-login failed:', signInResponse.statusText);
						// Verification successful but auto-login failed, redirect to login
						throw redirect(302, '/auth/login?verified=true');
					}

					console.log('🎉 [Verify Email] Auto-login successful');

					// Redirect to predictions - navbar will refresh session on mount
					throw redirect(302, '/predictions');
				} catch (loginError: any) {
					// Handle redirect
					if (loginError.status === 302) {
						throw loginError;
					}

					console.error('Auto-login error:', loginError);
					// Verification successful but auto-login failed, redirect to login
					throw redirect(302, '/auth/login?verified=true');
				}
			} else {
				// No signup credentials, redirect to login with success message
				console.log('📧 [Verify Email] No signup credentials, redirecting to login');
				throw redirect(302, '/auth/login?verified=true');
			}
		} catch (error: any) {
			// Handle redirect
			if (error.status === 302) {
				throw error;
			}

			// Handle Better Auth APIError
			if (error instanceof APIError) {
				console.log(`[Verify Email] APIError: ${error.message}, Status: ${error.status}`);

				// Handle invalid or expired OTP
				if (error.body?.code === 'INVALID_OTP') {
					form.message = 'Invalid verification code. Please check your code and try again.';
					return fail(400, { form });
				}

				if (error.body?.code === 'EXPIRED_OTP') {
					form.message = 'Verification code has expired. Please request a new one.';
					return fail(400, { form });
				}

				// Handle other API errors
				form.message = error.message || 'Verification failed. Please try again.';
				return fail(500, { form });
			}

			console.error('Verify email error:', error);
			form.message = 'Verification failed. Please try again.';
			return fail(500, { form });
		}
	}
};
