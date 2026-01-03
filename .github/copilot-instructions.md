# Master League - AI Coding Agent Instructions

## Project Overview

SvelteKit Premier League prediction platform with organization-based multi-tenancy. Users predict match scores within organizations, earn points (3 for exact score, 1 for correct outcome), and compete on leaderboards.

## Architecture

**Stack**: SvelteKit 2.x + Svelte 5 | PostgreSQL + Drizzle ORM | Better Auth | TailwindCSS v4 | Trigger.dev v4 | Sanity CMS

**Data Hierarchy** (all user data scoped by `organizationId`):

```
Organization → Members → Predictions → League Tables (per season)
                       ↘ Fixtures (shared globally)
```

**Key Directories**:

- `src/lib/server/db/` - Schema and database access
- `src/lib/server/engine/data/` - Core business logic (fixtures, predictions, processing)
- `src/lib/server/football/` - Football-specific services
- `src/routes/api/cron/` - Background job endpoints

## Svelte 5 Patterns (CRITICAL)

Always use Svelte 5 runes syntax - never legacy `$:` or `export let`:

```svelte
<script lang="ts">
	// Props with destructuring and defaults
	let { user, showNav = true }: { user: User; showNav?: boolean } = $props();

	// Derived state (replaces $:)
	let isAdmin = $derived(user?.role === 'admin');

	// Reactive state
	let isOpen = $state(false);

	// Effects with cleanup
	$effect(() => {
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	});
</script>
```

Access page data via `$app/state`:

```svelte
import {page} from '$app/state'; let {user} = $derived(page.data);
```

## Database Patterns

**Organization scoping** - Always filter by `organizationId`:

```typescript
const results = await db.select().from(predictions).where(eq(predictions.organizationId, orgId));
```

**Schema files**: `src/lib/server/db/schema.ts` (app) + `src/lib/server/db/auth/auth-schema.ts` (auth)

**Commands**:

```bash
pnpm db:generate     # Generate migration from schema changes
pnpm db:push         # Push directly to dev DB (no migration)
pnpm db:migrate      # Run migrations in production
pnpm db:studio       # Open Drizzle Studio
pnpm db:seed-fixtures # Seed fixtures for current season
```

## Authentication (Better Auth)

Session available in server loads via `locals`:

```typescript
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.id) throw redirect(302, '/auth/login');
	// locals.user and locals.session populated by hooks.server.ts
};
```

New users auto-assigned to default org and league table via hooks in `src/lib/server/db/auth/auth.ts`.

## Cron & Background Jobs

**Intelligent cron system** in `src/trigger/cron-tasks.ts` coordinates:

- `intelligent-processor` (15min) - Leaderboard maintenance
- `live-scores-updater` (2min during matches) - Live score updates
- `finished-fixtures-checker` - Post-match point calculations

**Football API rate limit**: 10 req/min - use existing queue in `src/lib/server/football/fixtures/fixtureApi.ts`

**Caching**: `src/lib/server/light-cache.ts` for server-side caching with tag-based invalidation

## Form Handling

Use Superforms with Zod validation:

```typescript
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { authLoginSchema } from '$lib/validation/auth-schemas';

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(authLoginSchema));
		if (!form.valid) return fail(400, { form });
		// process...
	}
};
```

## Points System

- **3 points**: Exact score prediction
- **1 point**: Correct outcome (win/draw/loss)
- **Multipliers**: 1 2x-multiplier and 1 3x-multiplier on selected fixtures per week

Processing flow: `finished-fixtures-checker` → `prediction-processor.ts` → `leaderboard.ts`

## Testing

```bash
pnpm test            # Run vitest
pnpm test:ui         # Vitest UI
pnpm test:e2e        # Playwright E2E
```

## Environment Variables

Required in `.env`:

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth encryption (32+ chars)
- `FOOTBALL_DATA_API_KEY` - football-data.org API
- `STRIPE_SECRET_KEY` - Stripe payments
- `RESEND_API_KEY` - Email delivery

## Common Gotchas

1. **Organization scoping** - Query without `organizationId` = data leak
2. **Svelte 5 syntax** - `$props()` not `export let`, `$derived` not `$:`
3. **API rate limits** - Never bypass the Football API queue system
4. **Trigger.dev deploys** - `pnpm deploy:trigger` separate from main app
5. **Auth checks** - Always verify `locals.user` before protected operations
