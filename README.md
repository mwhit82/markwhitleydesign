# Mark Whitley Design

Portfolio website built with Next.js App Router and Tailwind CSS.

## Local Development

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

This project uses a clean-start dev script and Turbopack to reduce stale cache/runtime issues during local development.
Development now uses a separate Next output directory (`.next-dev`) so running a production build no longer breaks localhost.

4. Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run build
npm run start
```

## If Local Dev Gets Weird

If you ever see stale runtime errors or hot refresh stops behaving:

```bash
npm run dev:reset
```

That clears `.next-dev` and starts the dev server fresh.

## Dev Workflow Note

- Use `npm run dev` for local preview.
- Use `npm run build` whenever you want a production verification.
- Dev uses `.next-dev` and production uses `.next`, so the two commands no longer step on each other.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Keep the default framework preset as `Next.js`.
4. Deploy.

No extra environment variables are required for the current version of the site.

### Auto Deploys

Once the GitHub repo is connected to a Vercel project:

- pushes to the production branch will trigger a production deploy
- pull requests and branch pushes can trigger preview deploys

This repo includes [vercel.json](/Users/markwhitley/Documents/Codex Projects/markwhitleydesign/vercel.json) so Vercel uses the expected install and build commands.

## Pocket Rally leaderboards

The rally stage picker supports four environments, three weather presets each,
and both directions. Shared rankings use Upstash Redis via server-only Next.js
routes. Until connected, racing and device personal bests work normally, and the
leaderboard clearly reports that it is unavailable.

Connect an Upstash Redis database to this Vercel project and set
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Production, then
redeploy. Vercel integration aliases `KV_REST_API_URL` and `KV_REST_API_TOKEN`
are also supported. Never use `NEXT_PUBLIC_` for these secrets. No migration is
required; the service creates namespaced keys on first use.

Players use signed browser cookies, not accounts. Clearing cookies or changing
devices creates a new driver. Each stage/weather/direction has an overall board
and four car boards. Only the best time per driver is retained. Equal times use
Redis member ordering. Runs expire after 15 minutes; submissions check server
elapsed time, checkpoint sequence, position bounds and maximum travel speed.
These are basic sanity checks, not cheat-proof authoritative simulation. Car
resets make a run practice-only. Client names are plain text, limited to 20
characters; race identifiers are one-use. UI pagination loads 20 rows at a time
and separately displays the player's rank when outside the loaded rows.

Checks: `node --test scripts/test-rally-*.mjs` and `npm run build`.
