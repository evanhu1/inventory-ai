# Inventory.ai

Inventory.ai is a collectible social game built with Next.js App Router, Clerk, Anthropic, Gemini Flash, and Neon Postgres on Vercel.

## What It Includes

- Anonymous public inventory browsing
- Google sign-in with Clerk
- Unique username onboarding
- Word crafting with profanity and dictionary checks
- First-edition shiny cards
- Fusion crafting that destroys source cards
- Direct trading and gifting
- Global inventory leaderboard
- Daily arena duel system that rewards trait-focused collecting
- Vercel deployment with Neon Postgres integration

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill in `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY`.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

The app runs on `http://localhost:3000`.

For a disposable local database on this machine:

```bash
docker compose up -d postgres
npm run db:migrate
npm run dev
```

## Scripts

- `npm run dev` starts the Next.js app
- `npm run build` builds the Next.js app
- `npm run start` runs the built Next.js app
- `npm run db:migrate` applies SQL migrations

## Deployment

Deploy on Vercel and attach a Neon Postgres database from the Vercel Marketplace.

Current structure:

- `app/` contains the user-facing pages and API route handlers
- `src/components/` contains reusable UI components
- `src/views/` contains page-level client components used by `app/`
- `src/server/` contains database access, game logic, and route error helpers
- `scripts/migrate.ts` applies SQL migrations

Set these project environment variables in Vercel:

- `DATABASE_URL` or `POSTGRES_URL`
- `DATABASE_URL_UNPOOLED` or `POSTGRES_URL_NON_POOLING`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
