# Master League — Full Tech Stack & API Rundown

Everything used in Master League, with Next.js equivalents where relevant.

---

## APIs & External Services

| Service               | What it does                                                                                       | Link / Details                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **football-data.org** | Premier League fixtures, live scores, match statuses                                               | Free tier available, **10 req/min rate limit** — you'll need a queue system                   |
| **Stripe**            | Subscriptions & payments (Basic/Pro/Enterprise plans, 14-day trials)                               | `stripe` npm package, webhook handling for lifecycle events                                   |
| **Resend**            | Transactional email (OTP codes, prediction reminders, welcome emails)                              | `resend` npm package, sends from custom domain                                                |
| **Sanity**            | Headless CMS for blog/content pages                                                                | `@sanity/client`, GROQ query language, visual editing, image CDN                              |
| **Trigger.dev v4**    | Background cron jobs (live scores every 2min, leaderboard updates every 15min, daily fixture sync) | Next.js alternative: **Inngest**, **Trigger.dev** (also supports Next.js), or **Vercel Cron** |

---

## Auth System

**Better Auth** — handles everything:

- Email/password signup with **email OTP verification** (6-digit code, 5-min expiry)
- **Organization/multi-tenancy** plugin (users belong to orgs, roles: owner/admin/member)
- **Stripe plugin** for subscription-gated features
- **Admin plugin** for user management, banning, impersonation
- Rate limiting (3 login attempts/min, stored in PostgreSQL)
- Session management with org context

**Next.js equivalent**: **Better Auth** works with Next.js too, or use **NextAuth (Auth.js)** / **Clerk** / **Lucia Auth**

---

## Database

| Tech            | Details                                          |
| --------------- | ------------------------------------------------ |
| **PostgreSQL**  | Primary database                                 |
| **Drizzle ORM** | Type-safe queries, migrations, schema management |

### Key Tables

- **teams** — PL team data (name, logo, shortName)
- **fixtures** — matches with scores, status, week, season, pointsMultiplier
- **predictions** — user predictions scoped by `organizationId` (unique per user+fixture)
- **leagueTable** — season standings per user per org (totalPoints, correctScorelines, correctOutcomes)
- **leaderboardMeta** — coordination metadata with locking for concurrent updates
- **subscriptions** — Stripe subscription tracking per org
- **user/session/account/verification/member/organization/invitation** — Better Auth tables

**Next.js equivalent**: Drizzle ORM works identically with Next.js + PostgreSQL. Use **Neon**, **Supabase**, or **Railway** for hosted Postgres.

---

## Points System / Business Logic

- **3 points** = exact score prediction
- **1 point** = correct outcome (home win/draw/away win)
- **Multipliers**: Each user picks 1 fixture at **2x** and 1 at **3x** per gameweek
- Processing flow: `finished-fixtures-checker` → `prediction-processor` → `leaderboard recalculation`
- Leaderboard has a **lock system** to prevent concurrent update corruption

---

## Background Jobs (Cron Tasks)

| Job                     | Schedule                     | Purpose                                                 |
| ----------------------- | ---------------------------- | ------------------------------------------------------- |
| `live-scores-updater`   | Every 2 min (during matches) | Fetch live scores from football-data.org                |
| `intelligent-processor` | Every 15 min                 | Orchestrate prediction processing + leaderboard updates |
| `fixture-schedule`      | Daily at 8 AM UTC            | Sync fixture schedule changes                           |
| `simple-coordinate`     | Every 15 min                 | Lightweight status check                                |
| `health-check`          | Every 30 min                 | System health monitoring                                |

Also has cron endpoints for: prediction reminders (email), leaderboard integrity checks, prediction safety checks.

**Next.js equivalent**: **Vercel Cron** + **Inngest** or **Trigger.dev** (supports Next.js natively)

---

## Caching

Custom **LightCache** class (in-memory, server-side):

- Max 1000 items, 5-min default TTL
- Tag-based and pattern-based invalidation
- LRU eviction
- Soft refresh (serve stale while refreshing in background)
- Specialised leaderboard cache and cron coordinator cache

**Next.js equivalent**: `unstable_cache` / `revalidateTag` from Next.js, or **Upstash Redis** for distributed caching

---

## Frontend Stack

| Tech                 | Purpose                    | Next.js Equivalent                             |
| -------------------- | -------------------------- | ---------------------------------------------- |
| **Svelte 5** (runes) | UI framework               | **React 19**                                   |
| **TailwindCSS v4**   | Styling                    | Same — works with Next.js                      |
| **Superforms + Zod** | Form handling & validation | **React Hook Form** + **Zod**, or **Conform**  |
| **D3 + LayerChart**  | Leaderboard visualisation  | **Recharts**, **Chart.js**, or **D3** directly |
| **Lucide icons**     | Icon library               | `lucide-react`                                 |
| **svelte-sonner**    | Toast notifications        | `sonner` (same lib, React version)             |
| **Motion**           | Animations                 | `motion` (same lib, works with React)          |
| **svelte-meta-tags** | SEO                        | Next.js built-in `metadata` API                |
| **super-sitemap**    | Dynamic sitemap            | Next.js `sitemap.ts` convention                |

---

## Email Templates

Built with **Svelte email components** (`better-svelte-email`):

- Welcome email
- Prediction reminder
- OTP verification
- Password reset
- Org invitations

**Next.js equivalent**: **React Email** (`@react-email/components`) — same concept, React-based

---

## Environment Variables Needed

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=your-32-char-secret
PUBLIC_BETTER_AUTH_URL=https://your-app.com

# Football Data
FOOTBALL_DATA_API_KEY=your-key-from-football-data.org

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# CMS (optional — only if using Sanity)
PUBLIC_SANITY_STUDIO_PROJECT_ID=...
PUBLIC_SANITY_STUDIO_DATASET=production

# Background Jobs
TRIGGER_API_KEY=...
```

---

## What to Sign Up For

1. **football-data.org** — free API key for Premier League data
2. **Stripe** — payments & subscriptions
3. **Resend** — email delivery (free tier: 3k emails/month)
4. **Sanity** — CMS for blog content (free tier available, optional)
5. **Trigger.dev** or **Inngest** — background jobs/cron
6. **PostgreSQL host** — Neon / Supabase / Railway (all have free tiers)
7. **Better Auth** or **NextAuth** — authentication
8. **Vercel** — hosting (Next.js deploys natively)

---

## Rebuild Plan — Step by Step (Next.js)

This is the order you should build it in. Each phase builds on the last. Don't skip ahead — get each phase working before moving on.

---

### Phase 1: Project Setup & Database (Week 1)

**Goal**: Empty Next.js app connected to a real database with your schema ready.

1. **Create the Next.js project**
   ```bash
   npx create-next-app@latest my-league --typescript --tailwind --eslint --app --src-dir
   ```
2. **Set up PostgreSQL**
   - Sign up for **Neon** (easiest free tier) or **Supabase** or **Railway**
   - Grab your `DATABASE_URL` connection string
3. **Install Drizzle ORM**
   ```bash
   npm install drizzle-orm pg
   npm install -D drizzle-kit @types/pg
   ```
4. **Create your schema** — define these tables in order:
   - `teams` — `id`, `name`, `shortName`, `logo`
   - `fixtures` — `id`, `matchId`, `weekId`, `season`, `matchDate`, `homeTeamId`, `awayTeamId`, `homeScore`, `awayScore`, `status`, `pointsMultiplier`
   - `predictions` — `id`, `userId`, `organizationId`, `fixtureId`, `predictedHomeScore`, `predictedAwayScore`, `points`, `createdAt`
   - `leagueTable` — `id`, `userId`, `organizationId`, `season`, `totalPoints`, `correctScorelines`, `correctOutcomes`, `predictedFixtures`, `completedFixtures`, `lastUpdated`
   - `leaderboardMeta` — `id`, `organizationId`, `season`, `lastLeaderboardUpdate`, `isLocked`, `totalMatches`, `finishedMatches`
   - `subscriptions` — `id`, `plan`, `referenceId`, `stripeCustomerId`, `stripeSubscriptionId`, `status`, `periodStart`, `periodEnd`, `seats`
5. **Run your first migration**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit push
   ```
6. **Create a `db/index.ts`** that exports a Drizzle client — every server file imports from here

**Done when**: You can connect to your DB and see empty tables in Drizzle Studio (`npx drizzle-kit studio`).

---

### Phase 2: Authentication (Week 2)

**Goal**: Users can sign up, verify email, log in, and you have sessions working.

1. **Pick your auth** — recommended options for Next.js:
   - **Better Auth** (same as Master League — works with Next.js)
   - **NextAuth / Auth.js** (most popular in Next.js ecosystem)
   - **Clerk** (easiest, hosted, but costs money at scale)
2. **If using Better Auth**:
   ```bash
   npm install better-auth
   ```

   - Set up the auth handler in `app/api/auth/[...all]/route.ts`
   - Configure Drizzle adapter (same schema approach)
   - Add email OTP plugin for verification
   - Auth tables (user, session, account, verification) are auto-created
3. **If using NextAuth**:
   ```bash
   npm install next-auth@beta
   ```

   - Set up in `auth.ts` at project root
   - Use Drizzle adapter: `@auth/drizzle-adapter`
   - Configure email provider for OTP
4. **Build auth pages**:
   - `/auth/login` — email + password form
   - `/auth/register` — signup form
   - `/auth/verify` — OTP code input
5. **Add middleware** (`middleware.ts`) to protect routes — redirect to login if not authenticated
6. **Set up Resend** for sending verification emails:
   ```bash
   npm install resend
   ```

   - Sign up at resend.com, get API key
   - Send OTP emails on signup

**Done when**: You can register, get an email code, verify, log in, and see your session. Protected pages redirect to login.

---

### Phase 3: Football Data API Integration (Week 3)

**Goal**: Fixtures from football-data.org are in your database and displayed on the frontend.

1. **Sign up at football-data.org** — get your free API key
2. **Build an API queue/rate limiter**:
   - football-data.org allows **10 requests per minute** on the free tier
   - Create a simple queue that spaces out requests (1 every 6 seconds)
   - Cache responses for 2 minutes to avoid repeat calls
3. **Create a fixture sync function**:
   - Call `https://api.football-data.org/v4/competitions/PL/matches?season=2025`
   - Map API response to your `fixtures` table schema
   - Map API status codes: `SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`, etc.
   - Upsert fixtures (insert or update if exists)
4. **Create a team seed script**:
   - Call `https://api.football-data.org/v4/competitions/PL/teams`
   - Insert all 20 PL teams into your `teams` table
   - Run this once manually
5. **Build the fixtures page** (`/fixtures` or `/predictions`):
   - Server component that fetches fixtures from your DB grouped by gameweek
   - Show date, time, home team vs away team, score (if available)
   - Add a week selector component to navigate between gameweeks
6. **Create an API route** `app/api/fixtures/sync/route.ts` to trigger sync manually for now

**Done when**: You can see all PL fixtures on your site, grouped by week, with team names and logos.

---

### Phase 4: Predictions System (Week 4)

**Goal**: Users can submit score predictions and they're saved to the database.

1. **Build the prediction form**:
   - For each fixture in a gameweek, show two number inputs (home score, away score)
   - Use **React Hook Form** + **Zod** for validation:
     ```bash
     npm install react-hook-form @hookform/resolvers zod
     ```
   - Validate: scores must be 0-99, integers only
2. **Create prediction API routes**:
   - `POST /api/predictions` — save/update a prediction
   - `GET /api/predictions?weekId=X` — get user's predictions for a week
   - **Always filter by userId AND organizationId** — never return other users' predictions before deadline
3. **Add prediction locking**:
   - Predictions lock at the fixture's `matchDate` (kickoff time)
   - Don't allow edits after kickoff
   - Show a countdown or "locked" state on the UI
4. **Add multipliers**:
   - Let users pick one fixture as **2x** and one as **3x** per gameweek
   - Store as `pointsMultiplier` on the prediction (or a separate field)
   - Only one of each per week — validate server-side
5. **Unique constraint**: One prediction per user per fixture — handle conflicts with upsert

**Done when**: Users can predict scores for upcoming fixtures, pick their multipliers, and predictions lock at kickoff.

---

### Phase 5: Points Calculation & Leaderboard (Week 5)

**Goal**: When matches finish, points are calculated and a leaderboard is displayed.

1. **Build the points calculator** — pure function, easy to test:
   ```typescript
   function calculatePoints(prediction, actual): number {
   	// Exact score match = 3 points
   	if (pred.home === actual.home && pred.away === actual.away) return 3;
   	// Correct outcome (both home win, both draw, both away win) = 1 point
   	if (getOutcome(pred) === getOutcome(actual)) return 1;
   	// Wrong = 0
   	return 0;
   }
   // Then multiply by the user's multiplier (1x, 2x, or 3x)
   ```
2. **Build the prediction processor**:
   - Find all fixtures with status `FINISHED` that have unprocessed predictions
   - Calculate points for each prediction
   - Update the `predictions` table with the `points` value
   - Mark predictions as processed (add a `processed` boolean column or use points !== null)
3. **Build the leaderboard**:
   - Aggregate points per user per organization per season into `leagueTable`
   - Track: total points, correct scorelines (3-pointers), correct outcomes (1-pointers), total predictions
   - Sort by total points descending
4. **Build the leaderboard page** (`/leaderboard`):
   - Server component fetching from `leagueTable`
   - Show rank, user name, points, correct scores, correct outcomes
   - Highlight the current user's row
5. **Add a recalculation endpoint** (`/api/admin/recalculate`) — useful for fixing bugs

**Done when**: After a match finishes and you run the processor, points appear and the leaderboard updates.

---

### Phase 6: Background Jobs / Cron (Week 6)

**Goal**: Everything runs automatically — live scores update, predictions process, leaderboard rebuilds.

1. **Pick your job system**:
   - **Vercel Cron** (simplest — just add to `vercel.json`)
   - **Inngest** (better for complex workflows)
   - **Trigger.dev** (same as Master League, supports Next.js)
2. **Set up these cron jobs**:

   | Job                 | Schedule                   | What it does                                                        |
   | ------------------- | -------------------------- | ------------------------------------------------------------------- |
   | Live scores         | Every 2-5 min (match days) | Fetch latest scores from football-data.org, update `fixtures` table |
   | Process predictions | Every 15 min               | Find finished matches, calculate points for all predictions         |
   | Rebuild leaderboard | Every 15 min               | Recalculate `leagueTable` from all processed predictions            |
   | Sync fixtures       | Daily at 8 AM              | Check for schedule changes (postponements, rescheduling)            |

3. **If using Vercel Cron** — create API routes and add to `vercel.json`:
   ```json
   {
   	"crons": [
   		{ "path": "/api/cron/live-scores", "schedule": "*/5 * * * *" },
   		{ "path": "/api/cron/process-predictions", "schedule": "*/15 * * * *" },
   		{ "path": "/api/cron/rebuild-leaderboard", "schedule": "*/15 * * * *" },
   		{ "path": "/api/cron/sync-fixtures", "schedule": "0 8 * * *" }
   	]
   }
   ```
4. **Secure your cron routes** — check for a `CRON_SECRET` header so random people can't trigger them
5. **Add a leaderboard lock** to prevent two concurrent recalculations corrupting data

**Done when**: Scores update live on match days, points calculate automatically, leaderboard stays current — all without you touching anything.

---

### Phase 7: Organizations / Multi-Tenancy (Week 7)

**Goal**: Users can create or join groups ("organizations") and compete in separate leaderboards.

1. **Organization CRUD**:
   - Create org (name, slug)
   - Invite members by email
   - Accept/decline invitations
   - Leave organization
   - Roles: owner, admin, member
2. **Scope everything by `organizationId`**:
   - Predictions: `WHERE organizationId = ?` on every query
   - Leaderboard: separate per org
   - **This is the most important security rule** — forgetting this = data leak
3. **Build org pages**:
   - `/organizations` — list your orgs, create new ones
   - `/organizations/[slug]` — org dashboard, member list, invite form
   - `/organizations/[slug]/leaderboard` — org-specific leaderboard
4. **Default organization** — auto-assign new users to a "Global" org so they have somewhere to play immediately
5. **Invitation system**:
   - Send invite email via Resend
   - Invite link with token, expires in 48 hours
   - Accept flow: validate token → add as member → redirect to org

**Done when**: Users can create groups, invite friends, and each group has its own leaderboard.

---

### Phase 8: Payments with Stripe (Week 8)

**Goal**: Organizations can subscribe to paid plans for extra features.

1. **Set up Stripe**:
   ```bash
   npm install stripe
   ```

   - Create products and prices in Stripe dashboard (Basic, Pro, Enterprise)
   - Set up a webhook endpoint: `app/api/webhooks/stripe/route.ts`
2. **Subscription flow**:
   - Org owner clicks "Upgrade" → redirect to Stripe Checkout
   - Stripe Checkout handles payment → webhook fires → update `subscriptions` table
   - Track: plan, status, period start/end, seats
3. **Webhook events to handle**:
   - `checkout.session.completed` — new subscription created
   - `customer.subscription.updated` — plan change or renewal
   - `customer.subscription.deleted` — cancellation
   - `invoice.payment_failed` — payment issue
4. **Gate features by plan**:
   - Free: 1 org, basic features
   - Basic: multiple orgs, email reminders
   - Pro: analytics, priority support
5. **14-day free trial** — configure in Stripe product settings

**Done when**: Orgs can subscribe, payments work, features are gated by plan.

---

### Phase 9: Polish & Nice-to-Haves (Week 9-10)

**Goal**: Make it feel like a real product.

1. **Email templates** — use **React Email** for nice HTML emails:
   ```bash
   npm install @react-email/components
   ```

   - Welcome email on signup
   - Prediction reminder before gameweek deadline
   - Weekly results summary
2. **Toast notifications** — `sonner` for React:
   ```bash
   npm install sonner
   ```
3. **Charts** — leaderboard position over time:
   ```bash
   npm install recharts
   ```
4. **SEO** — use Next.js `metadata` API in each page's layout/page file
5. **Sitemap** — `app/sitemap.ts` (built-in Next.js convention)
6. **Loading states** — React Suspense + skeleton components
7. **Error handling** — `error.tsx` and `not-found.tsx` pages
8. **Mobile nav** — bottom navigation bar for mobile (predictions, leaderboard, profile)
9. **CMS for blog** (optional) — Sanity or just markdown files

---

### Phase 10: Deploy (Week 10)

1. **Push to GitHub**
2. **Deploy to Vercel**:
   - Connect your repo
   - Add all environment variables
   - Deploy — it just works with Next.js
3. **Set up your domain** — point DNS to Vercel
4. **Configure Stripe webhooks** — point to your production URL
5. **Set up Resend domain** — verify your sending domain
6. **Enable cron jobs** — Vercel Cron activates on deploy
7. **Seed your database**:
   - Run team seed script
   - Run fixture sync
   - Create default organization
8. **Test the full flow**:
   - Register → verify email → join org → predict scores → wait for match → check points → check leaderboard

---

### Suggested Next.js Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   ├── middleware.ts                 # Auth protection
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify/page.tsx
│   ├── predictions/
│   │   └── page.tsx                  # Weekly prediction form
│   ├── leaderboard/
│   │   └── page.tsx                  # Standings table
│   ├── organizations/
│   │   ├── page.tsx                  # Your orgs
│   │   └── [slug]/
│   │       ├── page.tsx              # Org dashboard
│   │       └── leaderboard/page.tsx
│   ├── admin/
│   │   └── page.tsx                  # Admin panel
│   └── api/
│       ├── auth/[...all]/route.ts    # Auth handler
│       ├── predictions/route.ts      # CRUD predictions
│       ├── fixtures/sync/route.ts    # Manual fixture sync
│       ├── cron/
│       │   ├── live-scores/route.ts
│       │   ├── process-predictions/route.ts
│       │   ├── rebuild-leaderboard/route.ts
│       │   └── sync-fixtures/route.ts
│       └── webhooks/
│           └── stripe/route.ts       # Stripe webhooks
├── lib/
│   ├── db/
│   │   ├── index.ts                  # Drizzle client
│   │   └── schema.ts                # All table definitions
│   ├── auth/
│   │   └── index.ts                  # Auth config
│   ├── football/
│   │   ├── api.ts                    # football-data.org client + queue
│   │   └── sync.ts                   # Fixture sync logic
│   ├── engine/
│   │   ├── points.ts                 # Points calculation
│   │   ├── predictions.ts            # Prediction processing
│   │   └── leaderboard.ts           # Leaderboard recalculation
│   ├── email/
│   │   └── index.ts                  # Resend client + send helpers
│   ├── stripe/
│   │   └── index.ts                  # Stripe client + helpers
│   └── cache/
│       └── index.ts                  # Simple in-memory cache
├── components/
│   ├── Navbar.tsx
│   ├── BottomNav.tsx
│   ├── WeekSelector.tsx
│   ├── PredictionForm.tsx
│   ├── LeaderboardTable.tsx
│   └── ui/                           # Shared UI components
└── emails/
    ├── Welcome.tsx                   # React Email templates
    ├── VerifyOTP.tsx
    └── PredictionReminder.tsx
```

---

### Key npm Packages to Install

```bash
# Core
npm install next react react-dom typescript

# Database
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg

# Auth (pick one)
npm install better-auth              # Same as Master League
# OR
npm install next-auth@beta @auth/drizzle-adapter

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Payments
npm install stripe

# Email
npm install resend @react-email/components

# UI
npm install tailwindcss lucide-react sonner motion recharts

# Background Jobs (pick one)
npm install inngest                  # Recommended for Next.js
# OR
npm install @trigger.dev/sdk         # Same as Master League
```

---

## TL;DR

The core of it is: **PostgreSQL + football-data.org API + auth + Stripe + a cron system**. The CMS and email stuff are nice-to-haves you can add later.
