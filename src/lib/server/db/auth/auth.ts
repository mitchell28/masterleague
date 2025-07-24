import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username, emailOTP } from 'better-auth/plugins';
import { stripe } from '@better-auth/stripe';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from '../index';
import { getRequestEvent } from '$app/server';
import { Resend } from 'resend';
import { RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import Stripe from 'stripe';
const resend = new Resend(RESEND_API_KEY);

// Initialize Stripe client
const stripeClient = new Stripe(STRIPE_SECRET_KEY!, {
	apiVersion: '2025-06-30.basil'
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

	// Rate limiting configuration
	rateLimit: {
		enabled: true, // Enable in all environments
		window: 60, // 1 minute window
		max: 100, // 100 requests per minute (general)
		storage: 'database', // Store in database for persistence
		customRules: {
			// Stricter limits for authentication endpoints
			'/sign-in/email': {
				window: 60, // 1 minute
				max: 5 // Only 5 login attempts per minute
			},
			'/sign-up/email': {
				window: 60, // 1 minute
				max: 3 // Only 3 signup attempts per minute
			},
			'/email-otp/send-verification-otp': {
				window: 60, // 1 minute
				max: 3 // Only 3 OTP requests per minute
			},
			'/sign-in/email-otp': {
				window: 60, // 1 minute
				max: 5 // Only 5 OTP login attempts per minute
			}
		}
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
		}),
		stripe({
			stripeClient,
			stripeWebhookSecret: STRIPE_WEBHOOK_SECRET!,
			createCustomerOnSignUp: true,
			subscription: {
				enabled: true,
				plans: subscriptionPlans,
				requireEmailVerification: false,
				authorizeReference: async ({ user, referenceId, action }) => {
					// Check if user has permission to manage subscriptions for this group
					// This will be called for group-based subscriptions
					if (
						action === 'upgrade-subscription' ||
						action === 'cancel-subscription' ||
						action === 'restore-subscription'
					) {
						// Import the database query here to avoid circular imports
						const { db } = await import('../index');
						const { groupMemberships } = await import('../schema');
						const { eq, and } = await import('drizzle-orm');

						const membership = await db
							.select()
							.from(groupMemberships)
							.where(
								and(
									eq(groupMemberships.groupId, referenceId),
									eq(groupMemberships.userId, user.id),
									eq(groupMemberships.isActive, true)
								)
							)
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
		})
	]
});

// Export types
export type Auth = typeof auth;

// Default export for Better Auth auto-discovery
export default auth;
