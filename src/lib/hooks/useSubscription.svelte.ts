import { writable, derived, get } from 'svelte/store';
import { authClient } from '$lib/client/auth-client';
import type { Subscription } from '$lib/server/db/schema';

// Types for subscription management
export interface SubscriptionPlan {
	name: string;
	priceId: string;
	annualPriceId?: string;
	displayName: string;
	description: string;
	price: number;
	annualPrice?: number;
	maxMembers: number;
	features: string[];
	popular?: boolean;
}

export interface UpgradeSubscriptionData {
	plan: string;
	annual?: boolean;
	referenceId: string; // group ID
	successUrl: string;
	cancelUrl: string;
	seats?: number;
}

// Stores
export const groupSubscription = writable<Subscription | null>(null);
export const availablePlans = writable<SubscriptionPlan[]>([]);
export const isLoadingSubscription = writable(false);

// Derived stores
export const hasActiveSubscription = derived(groupSubscription, ($subscription) => {
	if (!$subscription) return false;
	return $subscription.status === 'active' || $subscription.status === 'trialing';
});

export const isTrialing = derived(
	groupSubscription,
	($subscription) => $subscription?.status === 'trialing'
);

export const subscriptionExpiry = derived(groupSubscription, ($subscription) => {
	if (!$subscription?.periodEnd) return null;
	return new Date($subscription.periodEnd);
});

export const daysUntilExpiry = derived(subscriptionExpiry, ($expiry) => {
	if (!$expiry) return null;
	const now = new Date();
	const diffTime = $expiry.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
});

// Default subscription plans
export const defaultPlans: SubscriptionPlan[] = [
	{
		name: 'basic',
		priceId: 'price_basic_monthly',
		annualPriceId: 'price_basic_annual',
		displayName: 'Basic',
		description: 'Perfect for small groups',
		price: 9.99,
		annualPrice: 99.99,
		maxMembers: 10,
		features: ['Up to 10 members', 'Weekly predictions', 'Basic league tables', 'Email support']
	},
	{
		name: 'pro',
		priceId: 'price_pro_monthly',
		annualPriceId: 'price_pro_annual',
		displayName: 'Pro',
		description: 'For larger groups with advanced features',
		price: 19.99,
		annualPrice: 199.99,
		maxMembers: 25,
		features: [
			'Up to 25 members',
			'Weekly predictions',
			'Advanced analytics',
			'Custom scoring rules',
			'Priority support'
		],
		popular: true
	},
	{
		name: 'enterprise',
		priceId: 'price_enterprise_monthly',
		annualPriceId: 'price_enterprise_annual',
		displayName: 'Enterprise',
		description: 'For large organizations',
		price: 49.99,
		annualPrice: 499.99,
		maxMembers: 100,
		features: [
			'Up to 100 members',
			'Weekly predictions',
			'Advanced analytics',
			'Custom scoring rules',
			'Multiple leagues',
			'White-label options',
			'Dedicated support'
		]
	}
];

// Function to convert Better Auth subscription to our schema format
function convertBetterAuthSubscription(betterAuthSub: any): Subscription {
	return {
		id: betterAuthSub.id,
		plan: betterAuthSub.plan,
		referenceId: betterAuthSub.referenceId,
		stripeCustomerId: betterAuthSub.stripeCustomerId || null,
		stripeSubscriptionId: betterAuthSub.stripeSubscriptionId || null,
		status: betterAuthSub.status,
		periodStart: betterAuthSub.periodStart ? new Date(betterAuthSub.periodStart) : null,
		periodEnd: betterAuthSub.periodEnd ? new Date(betterAuthSub.periodEnd) : null,
		cancelAtPeriodEnd: betterAuthSub.cancelAtPeriodEnd || false,
		seats: betterAuthSub.seats || 10,
		trialStart: betterAuthSub.trialStart ? new Date(betterAuthSub.trialStart) : null,
		trialEnd: betterAuthSub.trialEnd ? new Date(betterAuthSub.trialEnd) : null,
		createdAt: new Date(), // Better Auth doesn't provide this, use current time
		updatedAt: new Date() // Better Auth doesn't provide this, use current time
	};
}

// Subscription management functions
export function useSubscription() {
	const loadSubscription = async (groupId: string): Promise<void> => {
		isLoadingSubscription.set(true);
		try {
			// Use the Better Auth Stripe client to list subscriptions
			const result = await authClient.subscription.list({
				query: {
					referenceId: groupId
				}
			});

			if (result.data && result.data.length > 0) {
				// Find the active or trialing subscription
				const activeSubscription = result.data.find(
					(sub) => sub.status === 'active' || sub.status === 'trialing'
				);
				const selectedSub = activeSubscription || result.data[0];
				groupSubscription.set(convertBetterAuthSubscription(selectedSub));
			} else {
				groupSubscription.set(null);
			}
		} catch (error) {
			console.error('Failed to load subscription:', error);
			groupSubscription.set(null);
		} finally {
			isLoadingSubscription.set(false);
		}
	};

	const upgradeSubscription = async (
		data: UpgradeSubscriptionData
	): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
		try {
			// Use the Better Auth Stripe client
			const result = await authClient.subscription.upgrade({
				plan: data.plan,
				annual: data.annual,
				referenceId: data.referenceId,
				successUrl: data.successUrl,
				cancelUrl: data.cancelUrl,
				seats: data.seats
			});

			if (result.error) {
				return { success: false, error: result.error.message };
			}

			// The Better Auth client will handle the redirect automatically
			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const cancelSubscription = async (
		groupId: string,
		returnUrl: string
	): Promise<{ success: boolean; portalUrl?: string; error?: string }> => {
		try {
			// Use the Better Auth Stripe client
			const result = await authClient.subscription.cancel({
				referenceId: groupId,
				returnUrl
			});

			if (result.error) {
				return { success: false, error: result.error.message };
			}

			// The Better Auth client will handle the redirect automatically
			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const restoreSubscription = async (
		groupId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const currentSub = get(groupSubscription);

			if (!currentSub?.stripeSubscriptionId) {
				return { success: false, error: 'No subscription found to restore' };
			}

			// Use the Better Auth Stripe client
			const result = await authClient.subscription.restore({
				referenceId: groupId,
				subscriptionId: currentSub.stripeSubscriptionId
			});

			if (result.error) {
				return { success: false, error: result.error.message };
			}

			// Refresh subscription data
			await loadSubscription(groupId);

			return { success: true };
		} catch (error) {
			return { success: false, error: 'Network error occurred' };
		}
	};

	const loadPlans = async (): Promise<void> => {
		try {
			// For now, use default plans
			// In the future, you could fetch plans from an API
			availablePlans.set(defaultPlans);
		} catch (error) {
			console.error('Failed to load plans:', error);
			availablePlans.set(defaultPlans);
		}
	};

	const getPlanByName = (planName: string): SubscriptionPlan | undefined => {
		const plans = defaultPlans;
		return plans.find((plan) => plan.name === planName);
	};

	const calculateAnnualSavings = (plan: SubscriptionPlan): number => {
		if (!plan.annualPrice) return 0;
		const monthlyTotal = plan.price * 12;
		return monthlyTotal - plan.annualPrice;
	};

	return {
		loadSubscription,
		upgradeSubscription,
		cancelSubscription,
		restoreSubscription,
		loadPlans,
		getPlanByName,
		calculateAnnualSavings
	};
}
