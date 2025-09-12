import type { BetterAuthOptions } from 'better-auth';
import { admin, emailOTP, organization } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import Stripe from 'stripe';
import { stripe } from '@better-auth/stripe';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../index';
import { Resend } from 'resend';
import { getEnvVar } from '../../utils/env';
import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';

const resend = new Resend(getEnvVar('RESEND_API_KEY'));

// Initialize Stripe client
const stripeClient = new Stripe(getEnvVar('STRIPE_SECRET_KEY')!, {
	apiVersion: '2025-08-27.basil'
});

// Subscription plans configuration
const subscriptionPlans = [
	{
		name: 'basic',
		priceId: 'price_basic_monthly', // Replace with your actual Stripe price IDs
		annualDiscountPriceId: 'price_basic_annual',
		limits: {
			members: 10,
			predictions: 1000,
			storage: 1
		},
		freeTrial: {
			days: 14
		}
	},
	{
		name: 'pro',
		priceId: 'price_pro_monthly',
		annualDiscountPriceId: 'price_pro_annual',
		limits: {
			members: 25,
			predictions: 5000,
			storage: 5
		},
		freeTrial: {
			days: 14
		}
	},
	{
		name: 'enterprise',
		priceId: 'price_enterprise_monthly',
		annualDiscountPriceId: 'price_enterprise_annual',
		limits: {
			members: 100,
			predictions: 25000,
			storage: 25
		}
	}
];

/**
 * Custom options for Better Auth
 *
 * Docs: https://www.better-auth.com/docs/reference/options
 */
export const betterAuthOptions: BetterAuthOptions = {
	appName: 'Master League',
	trustedOrigins: ['http://localhost:5173', 'http://localhost:4173', 'https://masterleague.app'],

	database: drizzleAdapter(db, {
		provider: 'pg' // PostgreSQL
	}),

	// Enable email and password authentication
	emailAndPassword: {
		requireEmailVerification: true, // Block unverified users from signing in
		enabled: true,
		autoSignIn: false, // We handle sign-in manually after OTP verification
		sendResetPassword: async ({ user, url, token }, request) => {
			try {
				const emailResult = await resend.emails.send({
					from: 'Master League <noreply@mail.masterleague.app>',
					to: user.email,
					subject: 'Reset your Master League password',
					text: `Click the link to reset your password: ${url}`
				});

				// Check for Resend API errors (like testing restrictions)
				if (emailResult.error) {
					console.error(`❌ [OTP] Resend API Error:`, emailResult.error);

					// Handle specific Resend testing restrictions
					const errorObj = emailResult.error as any;
					if (errorObj.statusCode === 403 && errorObj.error?.includes('testing emails')) {
						throw new Error(
							`Email verification unavailable. Please contact support or use a different email address.`
						);
					}

					// Throw the original error for other cases
					throw new Error(
						errorObj.error || errorObj.message || 'Failed to send verification email'
					);
				}
			} catch (error) {
				console.error(`❌ [OTP] Failed to send email to ${user.email}:`, error);
				throw error;
			}
		}
	},

	// Add user creation debugging
	user: {
		changeEmail: {
			enabled: true
		}
	},

	advanced: {
		ipAddress: {
			ipAddressHeaders: ['x-client-ip', 'x-forwarded-for', 'cf-connecting-ip'] // generic specific header example
		}
	},

	// Rate limiting configuration
	rateLimit: {
		enabled: true, // Enable in all environments
		window: 60, // 1 minute window
		max: 100, // 100 requests per minute (general)
		storage: 'database', // Store in database for persistence
		modelName: 'rateLimit', // Use our existing rate limit table
		customRules: {
			// Stricter limits for authentication endpoints
			'/sign-in/email': {
				window: 60, // 1 minute
				max: 3 // Only 5 login attempts per minute
			},
			'/sign-up/email': {
				window: 60, // 1 minute
				max: 3 // Only 3 signup attempts per minute
			},
			'/email-otp/send-verification-otp': {
				window: 60, // 1 minute
				max: 3 // Increased from 3 OTP requests per minute
			},
			'/sign-in/email-otp': {
				window: 60, // 1 minute
				max: 5 // Increased from 5 to 8 OTP login attempts per minute
			}
		}
	},

	plugins: [
		admin({
			adminRoles: ['admin'] // Roles that have admin access
		}),
		organization({
			allowUserToCreateOrganization: true,
			membershipLimit: 100,
			organizationLimit: 5,
			invitationExpiresIn: 172800, // 48 hours
			async sendInvitationEmail(data) {
				try {
					const inviteLink = `${PUBLIC_BETTER_AUTH_URL}/accept-invitation/${data.id}`;

					await resend.emails.send({
						from: 'Master League <noreply@mail.masterleague.app>',
						to: data.email,
						subject: `You've been invited to join ${data.organization.name}`,
						html: `
							<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
								<h2 style="color: #2EFF9B;">MASTER LEAGUE</h2>
								<p>You've been invited to join <strong>${data.organization.name}</strong> by ${data.inviter.user.name}.</p>
								<p>Click the link below to accept the invitation:</p>
								<div style="margin: 20px 0;">
									<a href="${inviteLink}" style="background: #4338ca; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
										Accept Invitation
									</a>
								</div>
								<p style="color: #6b7280; font-size: 12px;">This invitation will expire in 48 hours.</p>
							</div>
						`,
						text: `You've been invited to join ${data.organization.name} by ${data.inviter.user.name}. Accept the invitation: ${inviteLink}`
					});

					console.log(
						`✅ [Organization] Invitation email sent to ${data.email} for organization ${data.organization.name}`
					);
				} catch (error) {
					console.error(`❌ [Organization] Failed to send invitation email:`, error);
					throw error;
				}
			}
		}),
		emailOTP({
			overrideDefaultEmailVerification: true, // Use OTP instead of email links
			sendVerificationOnSignUp: false, // Don't auto-send on signup - let frontend control this
			async sendVerificationOTP({ email, otp, type }) {
				// Only allow email verification OTPs, reject sign-in OTPs
				if (type === 'sign-in') {
					throw new Error('OTP sign-in is disabled. Please use email and password.');
				}

				try {
					const emailResult = await resend.emails.send({
						from: 'Master League <noreply@mail.masterleague.app>',
						to: email,
						subject:
							type === 'email-verification'
								? 'Verify your Master League email'
								: 'Reset your Master League password',
						html: `
							<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
								<h2 style="color: #2EFF9B;">MASTER LEAGUE</h2>
								<p>Your verification code is:</p>
								<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
									${otp}
								</div>
								<p style="color: #6b7280;">This code will expire in 5 minutes.</p>
								<p style="color: #6b7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
							</div>
						`,
						text: `Your Master League verification code is: ${otp}. This code will expire in 5 minutes.`
					});

					// Check for Resend API errors (like testing restrictions)
					if (emailResult.error) {
						console.error(`❌ [OTP] Resend API Error:`, emailResult.error);

						// Handle specific Resend testing restrictions
						const errorObj = emailResult.error as any;
						if (errorObj.statusCode === 403 && errorObj.error?.includes('testing emails')) {
							throw new Error(
								`Email verification unavailable. Please contact support or use a different email address.`
							);
						}

						// Throw the original error for other cases
						throw new Error(
							errorObj.error || errorObj.message || 'Failed to send verification email'
						);
					}
				} catch (error) {
					console.error(`❌ [OTP] Failed to send email to ${email}:`, error);
					throw error;
				}
			},
			otpLength: 6,
			expiresIn: 300, // 5 minutes
			allowedAttempts: 3
		}),
		stripe({
			stripeClient,
			stripeWebhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET')!,
			createCustomerOnSignUp: true,
			subscription: {
				enabled: true,
				plans: subscriptionPlans,
				requireEmailVerification: false,
				authorizeReference: async ({ user, referenceId, action }) => {
					// Check if user has permission to manage subscriptions for this organization
					// This will be called for organization-based subscriptions
					if (
						action === 'upgrade-subscription' ||
						action === 'cancel-subscription' ||
						action === 'restore-subscription'
					) {
						// Import the database query here to avoid circular imports
						const { db } = await import('../index');
						const { member } = await import('../auth/auth-schema');
						const { eq, and } = await import('drizzle-orm');

						const membership = await db
							.select()
							.from(member)
							.where(and(eq(member.organizationId, referenceId), eq(member.userId, user.id)))
							.limit(1);

						return (
							membership.length > 0 &&
							(membership[0].role === 'owner' || membership[0].role === 'admin')
						);
					}
					return true;
				},
				onSubscriptionComplete: async ({ subscription, plan }) => {
					console.log(`Subscription ${subscription.id} completed for plan ${plan.name}`);
					// You can add custom logic here, like sending welcome emails
				},
				onSubscriptionCancel: async ({ subscription }) => {
					console.log(`Subscription ${subscription.id} was canceled`);
					// You can add custom logic here, like sending cancellation emails
				}
			},
			schema: {
				subscription: {
					modelName: 'subscriptions' // Map to our existing subscriptions table
				}
			}
		}),
		// @ts-expect-error
		sveltekitCookies(getRequestEvent)
	]
};
