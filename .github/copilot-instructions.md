# Master League - AI Coding Agent Instructions

## Project Overview

Master League is a SvelteKit sports prediction platform with organization-based multi-tenancy, real-time fixture tracking, and comprehensive leaderboard systems. Users make predictions on Premier League matches within organizations, earn points based on accuracy, and compete in leaderboards.

## Architecture

### Core Stack

- **Frontend**: SvelteKit 2.x with Svelte 5 (using `$props()` and `$derived`)
- **Database**: PostgreSQL with Drizzle ORM, Better Auth for authentication
- **Styling**: TailwindCSS with custom design system (clip-path polygons for angular design)
- **Background Jobs**: Trigger.dev v4 for scheduled tasks and cron jobs
- **CMS**: Sanity for blog content management
- **External APIs**: Football-Data.org API for live fixture data

### Data Model Hierarchy

```
Organization (Multi-tenant root)
├── Members (users within org)
├── Predictions (user predictions per fixture)
├── League Tables (leaderboard per org/season)
└── Fixtures (shared across all orgs)
```

**Key Schema Files:**

- `src/lib/server/db/schema.ts` - Main application tables
- `src/lib/server/db/auth/auth-schema.ts` - Better Auth tables with organization plugin

## Critical Development Patterns

### 1. Authentication & Authorization

Uses Better Auth with organization plugin for multi-tenancy:

```typescript
// Always check session in server loads
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		session: locals.session
	};
};
```

**Key Auth Files:**

- `src/lib/server/db/auth/auth.ts` - Auth instance with organization hooks
- `src/lib/server/db/auth/betterauth-options.ts` - Configuration with Stripe integration
- `src/hooks.server.ts` - Session handling in SvelteKit hooks

### 2. Database Operations

All queries are organization-scoped where applicable:

```typescript
// Example: Always filter by organizationId
const predictions = await db
	.select()
	.from(predictions)
	.where(eq(predictions.organizationId, orgId));
```

**Migration Commands:**

```bash
pnpm db:generate    # Generate migrations
pnpm db:push        # Push to dev database
pnpm db:migrate     # Run migrations in production
```

### 3. Real-time Fixture Updates

Intelligent cron system updates fixtures and triggers point calculations:

**Key Cron Endpoints:**

- `/api/cron/intelligent-processor` - Smart coordinator for all tasks
- `/api/cron/live-scores-updater` - Live game score updates (every 2 minutes during match times)
- `/api/cron/finished-fixtures-checker` - Completed game verification
- `/api/cron/fixture-schedule` - Schedule changes detection

**Trigger.dev Tasks:** `src/trigger/cron-tasks.ts`

### 4. Points Calculation System

Located in `src/lib/server/football/predictions/`:

- **Prediction scoring**: 3 points exact score, 1 point correct outcome
- **Multipliers**: Random weekly multipliers (2x-5x) for selected fixtures
- **Leaderboard updates**: Triggered after fixture completion

### 5. Form Handling

Uses SvelteKit Superforms with Zod validation:

```typescript
// Server action pattern
export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		if (!form.valid) return fail(400, { form });
		// Process form...
	}
};
```

**Validation Schemas:** `src/lib/validation/auth-schemas.ts`

### 6. Component Patterns

Svelte 5 syntax with TypeScript:

```svelte
<script lang="ts">
	// Use $props() for component props
	let { data, user } = $props();

	// Use $derived for reactive computations
	let userPredictions = $derived(data.predictions.filter((p) => p.userId === user?.id));
</script>
```

### 7. API Rate Limiting & Caching

Football API calls are rate-limited (10 requests/minute):

- Uses queuing system in `src/lib/server/football/fixtures/fixtureApi.ts`
- Light caching for cron job coordination in `src/lib/server/light-cache.ts`

## Key Workflows

### Adding New Features

1. **Database changes**: Update schema, generate migration
2. **API endpoints**: Follow SvelteKit route conventions
3. **Forms**: Create Zod schema, implement server action
4. **Components**: Use Svelte 5 syntax with proper typing

### Testing Football API Integration

```bash
# Seed fixtures for current season
pnpm db:seed-fixtures

# Test live score updates
curl -X POST localhost:5173/api/cron/live-scores-updater \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Debugging Predictions

- Check `src/lib/server/football/predictions/predictionRepository.ts`
- Points calculations in `src/lib/server/football/predictions/pointsCalculator.ts`
- Admin tools at `/admin` for manual recalculation

## Environment Variables

Critical vars in `.env`:

- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth encryption key
- `FOOTBALL_DATA_API_KEY` - Live fixture data
- `STRIPE_SECRET_KEY` - Payment processing
- `RESEND_API_KEY` - Email delivery

## Important Files to Reference

- `src/lib/server/db/schema.ts` - Complete data model
- `src/routes/+layout.server.ts` - Global data loading
- `src/lib/server/football/predictions/` - Core prediction logic
- `drizzle.config.ts` - Database configuration
- `trigger.config.ts` - Background job configuration

## Common Gotchas

- Always scope queries by `organizationId` where applicable
- Use proper Svelte 5 syntax (`$props()`, `$derived`)
- Check auth state in server loads before protected operations
- Football API has strict rate limits - use existing queue system
- Trigger.dev tasks must be deployed separately from main app
