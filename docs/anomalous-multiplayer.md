# The Anomalous private co-op

Local implementation. No deployment or GitHub push is included.

## Run locally

Run `npm run dev` and, in another terminal, `npm run dev:coop`. Open
`http://localhost:3000/playground/the-anomalous` and choose **Play with friends**.
Create a room with a display name; share its code or invitation link. Each player
readies up before the host starts. Four seats maximum. Solo play is unchanged.

The native local adapter binds only to loopback and uses memory. Restarting it
removes local rooms. Its origin defaults to `http://localhost:3000`; set
`COOP_LOCAL_ORIGIN` if the frontend uses a different localhost origin.

Production routes use the existing Vercel WebSocket and Upstash Redis setup:
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the existing
`KV_REST_API_URL` and `KV_REST_API_TOKEN` aliases. No new package, database service,
account system or voice relay is required. Deployment must verify WebSocket
upgrade support, Redis pub/sub, origin checks and function recycling in the
actual project's runtime. The local adapter does not prove those deployed paths.

## Game rules

- One shared five-minute night, visitor schedule, decisions, questions, oven,
  residents, Mimics, dawn procession and outcome.
- Independent hunger, thirst, carried food, cosmetics and six-shot ammunition.
  First valid door decision or meal collection wins. Players cannot shoot one another.
- A player who runs out of hunger/thirst spectates until the next night. Everyone
  being dead or an unattended oven fire ends the team's night.
- Personal menus, focus loss and headset removal stop local controls only. The
  host can explicitly pause the team from the room menu.
- New players join between nights. Connections have a 30-second reconnect window;
  the earliest remaining member becomes host. An empty room freezes and expires.
- Completion receipts are idempotent using the existing save's `claimedRewards`.
  Progress, cosmetics and currency remain local browser saves, not account-backed
  or cheat-resistant competitive records.
- VR has controller-operated room creation and code entry, ready/setup controls,
  signals, voice controls and a stationary spectator screen. Display names for
  headset-created/joined seats are generated; browser players can type a name.
- The arcade remains solo-only during a co-op night.

## Voice

Voice is opt-in. Up to three direct WebRTC audio connections per player use public
STUN discovery. No audio is recorded or carried by the game server. Signalling
travels through the authenticated room connection, only to the named teammate.
Mute, per-peer browser volume and reconnect controls are provided. Turning voice
off or leaving releases microphone tracks, audio nodes and peer connections.

There is deliberately no TURN relay. Restrictive networks may prevent voice;
quick signals continue to work. Real microphones, autoplay permissions and
cross-network audio require device testing before release. Physical Quest
readability, stereo hands, teleport and spectator comfort also remain device checks.

## Architecture and verification

`lib/deader/multiplayer/simulation.ts` composes the existing pure solo rules.
An authenticated socket adapter submits actions through atomic Redis CAS updates.
A renewable room lease selects one simulation driver. It advances in 100ms steps;
lag recovery is capped to two seconds to bound server work. Pose delivery is
separate, at most 15Hz per player. Run identifiers reject stale poses and decisions.
The local adapter and real-socket integration tests share this exact socket handler.

Run `npm run test:coop` for pure rules and four real local WebSocket clients;
`npm run test:deader` for solo regressions; `npx tsc --noEmit` and `npm run build`
for compilation. `npx eslint app components lib scripts` excludes generated
Next caches; the repository's broad `npm run lint` currently includes `.next-dev`
and generated declarations, which produce unrelated generated-code errors.

Browser development diagnostics are exposed on the existing canvas as
`data-coop-stats`: player count, geometries, textures, rolling mean and p95 frame
intervals. They are omitted in production. Four local browser clients have been
exercised together; device and deployed-network testing are separate release gates.
