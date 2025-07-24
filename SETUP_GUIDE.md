# 🚀 Complete Groups & Monetization Setup Guide

## Current Status

✅ **Implemented:**

- Database schema with groups, memberships, and subscriptions
- Svelte hooks for group and subscription management
- API endpoints for group operations
- Better Auth + Stripe integration
- UI components for group dashboard
- Safe migration scripts

⚠️ **Need to Complete:**

## 1. Database Migration (IMPORTANT - DO THIS FIRST)

You were about to run a migration that would cause data loss. Instead, use our safe migration:

### Option A: Use the Safe Migration Script (Recommended)

```bash
# Add the required dependency if you don't have it
pnpm add postgres

# Run the safe migration
pnpm run db:safe-migration

# Verify it worked
pnpm run db:verify-migration
```

### Option B: Manual SQL Execution

If you prefer to run the SQL manually:

1. Connect to your database
2. Execute `/drizzle/0008_safe_migration.sql`
3. Run the verification script

## 2. Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

To get these:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode)
4. For webhook secret:
   - Go to **Developers > Webhooks**
   - Create a new webhook endpoint: `https://yourdomain.com/api/auth/stripe/webhook`
   - Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the **Signing secret** (starts with `whsec_`)

## 3. Create Stripe Products & Prices

In your Stripe Dashboard, create these products with monthly and annual prices:

### Basic Plan

- **Product Name:** "Basic League Plan"
- **Monthly Price:** $9.99 USD
- **Annual Price:** $99.99 USD (save 17%)

### Pro Plan

- **Product Name:** "Pro League Plan"
- **Monthly Price:** $19.99 USD
- **Annual Price:** $199.99 USD (save 17%)

### Enterprise Plan

- **Product Name:** "Enterprise League Plan"
- **Monthly Price:** $49.99 USD
- **Annual Price:** $499.99 USD (save 17%)

Copy the **Price IDs** and update them in `/src/lib/server/db/auth/auth.ts`:

```typescript
const subscriptionPlans = [
	{
		name: 'basic',
		priceId: 'price_YOUR_BASIC_MONTHLY_PRICE_ID',
		annualDiscountPriceId: 'price_YOUR_BASIC_ANNUAL_PRICE_ID'
		// ...
	}
	// ... update all plans
];
```

## 4. Test the Integration

1. **Start your development server:**

   ```bash
   pnpm dev
   ```

2. **Test group creation:**
   - Sign up a new user
   - They should automatically get a default group from migration
   - Test creating a new group
   - Test joining groups with invite codes

3. **Test subscription flow:**
   - Try to upgrade a group's subscription
   - Should redirect to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`

## 5. Webhook Testing (Local Development)

Install Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:5173/api/auth/stripe/webhook
```

This will give you a webhook secret for local testing.

## 6. Production Deployment

1. **Set production environment variables:**

   ```bash
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   ```

2. **Configure production webhook endpoint:**
   - Point to: `https://yourdomain.com/api/auth/stripe/webhook`
   - Select the same events as development

3. **Update price IDs** to use live prices instead of test prices

## 7. Add Groups UI to Your App

Import and use the groups dashboard:

```svelte
<!-- In your main app page -->
<script>
	import { GroupsDashboard } from '$lib/components';
	import { authClient } from '$lib/client/auth-client';

	const { data: session } = authClient.useSession();
</script>

{#if $session}
	<GroupsDashboard />
{:else}
	<!-- Your login form -->
{/if}
```

## 8. Data Migration Notes

The safe migration will:

- ✅ Preserve all existing predictions and league table data
- ✅ Create a default group for each user with existing data
- ✅ Make all existing users the owner of their default group
- ✅ Add proper foreign key relationships

Default groups will be named: "{User's Name}'s League" and can be renamed later.

## 9. Testing Checklist

- [ ] Migration completed without data loss
- [ ] Users can create new groups
- [ ] Users can join groups with invite codes
- [ ] Users can upgrade group subscriptions
- [ ] Webhook events are processed correctly
- [ ] Existing predictions still work
- [ ] League tables are scoped to groups

## 10. Features Now Available

### For Users:

- Create and manage prediction groups
- Invite friends with simple codes
- Subscribe to unlock premium features
- View group-specific league tables
- Manage group memberships

### For Group Owners:

- Subscription management for entire group
- Member management (remove members)
- Generate new invite codes
- Upgrade/downgrade plans
- Cancel subscriptions

### Monetization:

- Group-based subscriptions (one person pays for group)
- Tiered pricing with different member limits
- Annual billing discounts
- Trial periods
- Stripe-powered billing portal

## 🎉 You're Ready!

Once you complete the migration and environment setup, your app will have:

- Full group-based prediction leagues
- Stripe-powered monetization
- Scalable subscription management
- Data preserved from your existing system

Need help? Check the logs and run the verification script to ensure everything is working correctly.
