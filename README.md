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
