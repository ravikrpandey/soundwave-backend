# Soundwave Backend

This repository is the Render-hosted Express/tRPC API for Soundwave. It serves catalog search, Audius discovery, compliant official YouTube discovery, and persistent private likes/playlists backed by Supabase PostgreSQL.

## Required Render environment values

| Variable | Purpose |
| --- | --- |
| `FRONTEND_ORIGIN` | Exact GitHub Pages origin: `https://ravikrpandey.github.io`. |
| `SUPABASE_URL` | Public Supabase project URL used only to locate the JWT issuer and public JWKS. |
| `SUPABASE_DATABASE_URL` | Server-only current Supabase Session Pooler connection URI. |
| `YOUTUBE_DATA_API_KEY` | Server-only YouTube Data API key for visible official-video search. |
| `NODE_ENV` | `production`. |
| `NODE_VERSION` | `22.13.0` or compatible Node 22 runtime. |

`GET /health` is public. All private library calls require a Supabase access token. The server verifies token issuer, audience, expiry, signature, and authenticated role using the Supabase JWKS before looking up or creating the Soundwave user. It does not accept a user ID from the browser and does not use cross-site session cookies.

## Deploying on Render

Create a Node Web Service from this repository (or use the included `render.yaml` blueprint), choose the free plan, set the variables above in the Render dashboard, then deploy. Render assigns `PORT`; do not set it manually. After the service is live, copy its public HTTPS URL to the frontend repository’s `SOUNDWAVE_API_BASE_URL` Actions variable.

The free Render service may sleep when idle, so the first request after inactivity may be slower. Do not add credentials to `render.yaml`, source files, commits, or build logs.

## Local validation

Create a private untracked `.env` file with the required environment values, then run `corepack enable && pnpm install && pnpm test && pnpm check && pnpm build`. Run live database checks only with `RUN_LIVE_SUPABASE_TESTS=true`.

Commercial tracks remain discovery results that play solely in a visible official YouTube embed; this API does not extract or proxy commercial audio.
