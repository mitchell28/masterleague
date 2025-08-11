import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username, emailOTP, organization } from 'better-auth/plugins';
import { stripe } from '@better-auth/stripe';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from '../index';
import { getRequestEvent } from '$app/server';
import { Resend } from 'resend';
import { getEnvVar } from '../../utils/env.js';
import Stripe from 'stripe';
const resend = new Resend(getEnvVar('RESEND_API_KEY'));

// Initialize Stripe client
const stripeClient = new Stripe(getEnvVar('STRIPE_SECRET_KEY')!, {
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
		modelName: 'rateLimit', // Use our existing rate limit table
		// Custom IP detection to help with the "No IP address found" issue
		getIP: (request: any) => {
			// Try multiple headers for IP detection
			const forwarded = request.headers.get('x-forwarded-for');
			const realIP = request.headers.get('x-real-ip');
			const cfConnectingIP = request.headers.get('cf-connecting-ip');

			let clientIP = forwarded?.split(',')[0] || realIP || cfConnectingIP;

			// Fallback to a default if no IP found (for development/testing)
			if (!clientIP) {
				clientIP = '127.0.0.1'; // localhost fallback
				console.warn(`⚠️  [Rate Limit] No IP address found, using fallback: ${clientIP}`);
			} else {
				console.log(`🔍 [Rate Limit] Client IP detected: ${clientIP}`);
			}

			return clientIP;
		},
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
				max: 5 // Increased from 3 to 5 OTP requests per minute
			},
			'/sign-in/email-otp': {
				window: 60, // 1 minute
				max: 8 // Increased from 5 to 8 OTP login attempts per minute
			}
		},
		// Add error logging for rate limiting
		onLimitReached: (key: string, info: any) => {
			console.warn(`🚫 [Rate Limit] Limit reached for ${key}:`, {
				current: info.current,
				limit: info.limit,
				windowStart: new Date(info.windowStart),
				resetTime: new Date(info.windowStart + info.window * 1000)
			});
		}
	},

	plugins: [
		username(),
		sveltekitCookies(async () => getRequestEvent()),
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
					const inviteLink = `${getEnvVar('PUBLIC_BETTER_AUTH_URL')}/accept-invitation/${data.id}`;

					await resend.emails.send({
						from: 'Master League <noreply@mail.masterleague.app>',
						to: data.email,
						subject: `You've been invited to join ${data.organization.name}`,
						html: `
							<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
								<h2 style="color: #4338ca;">Master League</h2>
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
			sendVerificationOnSignUp: true, // Send OTP when user signs up
			async sendVerificationOTP({ email, otp, type }) {
				console.log(`🔐 [OTP] Attempting to send OTP to: ${email}`);
				console.log(`🔐 [OTP] Type: ${type}`);
				console.log(`🔐 [OTP] OTP Code: ${otp}`);

				// Log email domain for debugging
				const emailDomain = email.split('@')[1];
				console.log(`🔐 [OTP] Email domain: ${emailDomain}`);

				// Check for common email domains and log
				const commonDomains = [
					'gmail.com',
					'yahoo.com',
					'outlook.com',
					'hotmail.com',
					'icloud.com'
				];
				if (commonDomains.includes(emailDomain)) {
					console.log(`✅ [OTP] Using common email domain: ${emailDomain}`);
				} else {
					console.log(`⚠️  [OTP] Using less common email domain: ${emailDomain}`);
				}

				try {
					const emailResult = await resend.emails.send({
						from: 'Master League <noreply@mail.masterleague.app>', // Use Resend's default domain to avoid deliverability issues
						to: email,
						subject:
							type === 'sign-in'
								? 'Sign in to Master League'
								: type === 'email-verification'
									? 'Verify your Master League email'
									: 'Reset your Master League password',
						html: `
							<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
								<h2 style="color: #4338ca;">Master League</h2>
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

					console.log(`✅ [OTP] Email sent successfully to ${email}`);
					console.log(`✅ [OTP] Full Resend result:`, JSON.stringify(emailResult, null, 2));
					console.log(`✅ [OTP] Resend Email ID:`, emailResult.data?.id);

					// Check for Resend API errors (like testing restrictions)
					if (emailResult.error) {
						console.error(`❌ [OTP] Resend API Error:`, emailResult.error);

						// Handle specific Resend testing restrictions
						const errorObj = emailResult.error as any;
						if (errorObj.statusCode === 403 && errorObj.error?.includes('testing emails')) {
							console.error(
								`🚫 [OTP] RESEND TESTING RESTRICTION: Can only send to verified email addresses`
							);
							console.error(
								`🚫 [OTP] To fix: Verify a domain at resend.com/domains or add ${email} as a verified sender`
							);

							// Throw a more user-friendly error
							throw new Error(
								`Email verification unavailable for ${emailDomain}. Please contact support or use a different email address.`
							);
						}

						// Throw the original error for other cases
						throw new Error(
							errorObj.error || errorObj.message || 'Failed to send verification email'
						);
					}

					// Check if email was actually sent
					if (!emailResult.data?.id) {
						console.warn(`⚠️  [OTP] No email ID returned, email may not have been sent properly`);
					}
				} catch (error) {
					console.error(`❌ [OTP] Failed to send email to ${email}:`, error);

					// Log detailed error information
					if (error instanceof Error) {
						console.error(`❌ [OTP] Error message:`, error.message);
						console.error(`❌ [OTP] Error stack:`, error.stack);
					}

					// Log specific error details for Resend API
					if (typeof error === 'object' && error !== null) {
						console.error(`❌ [OTP] Full error object:`, JSON.stringify(error, null, 2));
					}

					// Re-throw the error so Better Auth can handle it
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
						const { member } = await import('../schema');
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
		})
	]
});

// Export types
export type Auth = typeof auth;

// Default export for Better Auth auto-discovery
export default auth;
