import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username, emailOTP } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from '../index';
import { getRequestEvent } from '$app/server';
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';
const resend = new Resend(RESEND_API_KEY);

// Create and export the auth instance
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg' // PostgreSQL
	}),

	// Enable email and password authentication
	emailAndPassword: {
		enabled: true,
		autoSignIn: true
	},

	plugins: [
		username(),
		sveltekitCookies(async () => getRequestEvent()),
		admin({
			adminRoles: ['admin'] // Roles that have admin access
		}),
		emailOTP({
			overrideDefaultEmailVerification: true, // Use OTP instead of email links
			sendVerificationOnSignUp: true, // Send OTP when user signs up
			async sendVerificationOTP({ email, otp, type }) {
				resend.emails.send({
					from: 'onboarding@resend.dev',
					to: email,
					subject:
						type === 'sign-in'
							? 'Sign in to your account'
							: type === 'email-verification'
								? 'Verify your email address'
								: 'Reset your password',
					html: `<p>Your verification code is: <strong>${otp}</strong></p>
					       <p>This code will expire in 5 minutes.</p>`
				});
			},
			otpLength: 6,
			expiresIn: 300, // 5 minutes
			allowedAttempts: 3
		})
	]
});

// Export types
export type Auth = typeof auth;

// Default export for Better Auth auto-discovery
export default auth;
