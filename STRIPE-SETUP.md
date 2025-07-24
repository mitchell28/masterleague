# Stripe Setup Guide

## Prerequisites

Your groups and subscription system is now ready! You need to configure Stripe to enable payments.

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Get from Stripe Dashboard -> Developers -> API Keys
STRIPE_WEBHOOK_SECRET=whsec_... # Get from Stripe Dashboard -> Developers -> Webhooks
```

## Stripe Dashboard Setup

### 1. Create Products in Stripe Dashboard

Go to Stripe Dashboard -> Products and create these 3 products:

**Basic Plan - $9.99/month**

- Name: "Basic Membership"
- Description: "Up to 10 members per group"
- Price: $9.99 USD Monthly

**Pro Plan - $19.99/month**

- Name: "Pro Membership"
- Description: "Up to 50 members per group"
- Price: $19.99 USD Monthly

**Enterprise Plan - $49.99/month**

- Name: "Enterprise Membership"
- Description: "Up to 100 members per group"
- Price: $49.99 USD Monthly

### 2. Update Price IDs

After creating the products, copy the Price IDs and update them in:

`src/lib/server/db/auth/auth.ts`:

```typescript
subscriptionPlans: [
	{
		id: 'basic',
		name: 'Basic',
		description: 'Up to 10 members',
		price: 999, // $9.99 in cents
		currency: 'usd',
		duration: 'month',
		metadata: {
			maxMembers: '10'
		},
		stripePriceId: 'price_YOUR_BASIC_PRICE_ID_HERE'
	}
	// ... update the other plans too
];
```

### 3. Configure Webhooks

1. Go to Stripe Dashboard -> Developers -> Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/auth/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Testing

### In Development

Use Stripe test mode with test cards:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### Webhook Testing

Use Stripe CLI to forward webhooks locally:

```bash
stripe listen --forward-to localhost:5173/api/auth/stripe/webhook
```

## Features Available

✅ **Group Management**

- Create/join groups with invite codes
- Role-based access (owner, admin, member)
- Group-specific leaderboards

✅ **Subscription Tiers**

- Basic: 10 members ($9.99/month)
- Pro: 50 members ($19.99/month)
- Enterprise: 100 members ($49.99/month)

✅ **Better Auth Integration**

- Automatic customer creation
- Subscription lifecycle management
- Webhook handling for events

✅ **Svelte Hooks**

- `useGroups()` - Group management
- `useSubscription()` - Subscription management
- Reactive updates

## Next Steps

1. Add Stripe environment variables
2. Update Stripe Price IDs in auth config
3. Deploy webhook endpoint
4. Test complete subscription flow
