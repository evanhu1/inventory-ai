# Inventory.ai

Inventory.ai is a collectible social game built with React, Vite, Tailwind CSS, Express, Clerk, Anthropic, Gemini Flash, and Postgres.

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
- Render deployment blueprint with managed Postgres

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill in `DATABASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENAI_API_KEY`.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

The frontend runs on `http://localhost:5173` and proxies API requests to the Express server on `http://localhost:8787`.

## Scripts

- `npm run dev` starts Vite and the Express API together
- `npm run build` builds the client and server
- `npm run start` runs the compiled production server
- `npm run db:migrate` applies SQL migrations

## Deployment

`render.yaml` provisions:

- One Node web service
- One managed Postgres database

Set the remaining secrets in Render:

- `PUBLIC_APP_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENAI_API_KEY`
