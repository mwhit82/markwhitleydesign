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


### Finish celebrations and ghosts (V2.1)

Every route has an open finish tent, a three-second arrival, confetti and a
36-person clay crowd. The finish callback freezes time and recordings before
arrival; skipping arrival cannot record another result. Reduced motion disables
camera flashes and falling confetti and keeps supporters still.

Garage ghosts: Off, My best, or Leaderboard best. G / controller Square / the
on-screen Ghost button toggle visibility during a run. Personal replays stay
on the device, keyed by car, stage, weather and direction. Legacy best times
remain; a new faster clean run is required to add a missing recording.

Version-1 replays contain car, stage selection, finish time and samples
`[time, x, z, heading]` at about 4 Hz, with a final finish sample. Recordings stop
at ten minutes / 2,600 samples. Submission checks replay shape and agreement
with the validated trace. The same Lua operation consumes the one-use race
identifier and replaces score, metadata and replay only for improved times.
`GET /api/rally/ghost?stage=forest&weather=clear&reverse=false&car=0` returns
only the same-car leader's name, time and replay. Old leaders with no recording
return a null replay. Ghost downloads never block racing, and a pending download
cannot change the rival after an attempt starts. Paginated boards omit replays.

Release checks include automated route/crowd validation across all 24 selections,
completion/skip one-shot behavior, legacy PB and practice-run handling, failed
and late downloads, angle wrapping, and malformed replay rejection. An isolated
Upstash test with 60-second-expiring QA keys verified slower/improved submissions,
duplicate consumption, car-specific leaders and missing legacy recordings.
Browser previews checked 844×390 landscape and 393×852 portrait. In the forest
finish view, atmosphere added 32 visible draw calls and 7,976 triangles versus
hiding that group (794/107,492 vs 762/99,516); this is a scene-cost comparison,
not a physical iPhone FPS measurement. Physical controller/iPhone testing remains
manual. No QA preview buttons are included in the release.


### Reliable finishes and rally instruments (V2.2)

Swept checkpoint detection retains the seven-unit acceptance radius and existing
ranked timing. Crossing a later gate marks skipped checkpoints once; a forward
finish crossing always completes the attempt. Missing checkpoints, recovery or
the ten-minute limit make results practice-only, with explicit reasons. These
runs cannot overwrite personal bests, replays or public records. The existing
server trace checks now also consider segments between adjacent samples.

The charcoal/cream/orange HUD includes two prioritised checkpoint notifications,
compact timing and RPM instruments, and peripheral touch controls. Pause freezes
notifications and preserves countdown/race state. Main menu ends the attempt and
returns to the garage without clearing settings or records. Garage selections,
pause, results and leaderboards share the new styling; keyboard and controller
menus use the same focus/activation actions. Start and finish bars have labels.

Design references: [Rush Rally Origins](https://apps.apple.com/gb/app/rush-rally-origins/id1557502285),
[Rush Rally 3](https://play.google.com/store/apps/details?id=brownmonster.app.game.rushrally3),
[Horizon Chase 2](https://apps.apple.com/us/app/horizon-chase-2/id1534920947) and
[Asphalt Legends](https://apps.apple.com/us/app/asphalt-legends-racing-game/id805603214).

Automated coverage includes all 24 selections with centreline and wide-offset
paths, frame gaps, backward gates, Alpine shortcut finishes, event deduplication,
notification priority/pause/expiry, result eligibility and countdown resumption.
The HUD adds no 3D instruments or animated blur; gate labels add four static
planes (eight triangles), with at most four extra draw calls. A desktop Node
microbenchmark averaged 0.00032 ms per checkpoint update; this is not an iPhone
frame-rate measurement. Physical iPhone and controller verification remains manual.
