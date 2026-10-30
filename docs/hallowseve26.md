# HallowsEve26 — Santa’s Last Stand

A single-player isometric voxel castle defence game at `/playground/hallowseve26`.
Twelve days run from December 13 through Christmas Eve, followed by Christmas
morning if the Hearth survives. The local campaign takes about 30–45 minutes.

## Playing

Click or tap open ground to move Santa. Drag to pan, scroll/pinch to zoom, and
use the Santa button to recenter. Build mode previews a grid footprint; tap to
lock the site, then confirm with Build. Tap a building for its health, upgrade,
and removal controls. Escape cancels, Space pauses, and R rotates placement.

Begin with a toy workshop and two nutcracker towers near the Hearth. Elves
prioritise construction, repairs, workshop staffing, and then gathering. Each
workshop uses one elf. Trees and stone deposits are represented by resource
sites; each replenishes at dawn. All construction, repair, and gathering stop
at night, but completed staffed workshops continue producing toy parts.

Santa restores shrines by standing nearby for four daylight seconds. Each
shrine adds two elves and a 20% production bonus. He attacks automatically at
night. Christmas cheer heals Santa and nearby buildings, damages and slows
nearby enemies, and has an 18-second cooldown. Santa recovers after ten seconds
if defeated; the Hearth’s destruction ends the campaign.

Nutcrackers favour single targets, snow-globes slow groups, and jack-in-the-box
launchers deal splash damage. Towers and walls can be upgraded once. Workshops
expand from 2×2 to 3×3, requiring adjacent clear cells. Daytime demolition refunds
half the base and upgrade costs. Gates allow friendly passage but block raiders.
Enemies can breach an otherwise sealed castle. The Pumpkin King joins night 12.

## Save and settings

Version-1 local saves use `hallowseve26-save-v1`. Saves occur at dawn, on pause,
on leaving the game through its navigation, and when the tab becomes hidden.
Continue restores the full campaign, including an interrupted wave. The game
pauses while hidden and never simulates offline progress. Starting a new campaign
asks before replacing a saved one. Invalid saves are rejected without crashing.
Sound preference uses `hallowseve26-muted`. Audio is locally synthesised and
starts only after user interaction. System reduced-motion preferences disable
smoke animation and projectile arcs.

## Implementation and checks

`components/hallowseve26/simulation.ts` owns deterministic 20 Hz game rules,
seeded waves, grid navigation, building footprints, and save validation. Rendering
uses the existing React Three Fiber stack, an orthographic camera, colour-batched
instanced boxes, capped effects, bounded dynamic lights, and adaptive pixel ratio.
No network services, external art, or backend credentials are needed.

Run `npm run test:hallowseve26` for construction, economy, navigation, saves,
combat, defeat, and a twelve-wave campaign regression. Run `npm run build` for
production verification. Tests use the repository’s existing TypeScript loader.
Physical-device touch and audio performance should be checked on target phones;
desktop viewport checks do not establish physical mobile performance.

### Verification of this version

- Fourteen gameplay checks pass, including an entire twelve-night campaign,
  defeat without expansion, siege save/resume, blocked routes, and gatherers
  returning from shelter. Gatherers finish 12-unit batches before switching
  resources, preventing repeated travel with little collection.
- TypeScript passes. The production build passes with `--no-lint`; the full
  repository lint worker stalled while loading its dependencies. The local
  verification used a temporary system-download transport for the existing
  Google fonts because Node’s font requests stalled; no font or network
  workaround is included in application source.
- Browser checks covered 1280×720 desktop, 393×852 phone portrait, 844×390 phone
  landscape, and 1024×768 tablet layouts; workshop/tower placement, shrine
  recruitment, a night attack, dawn progression, building selection, and saved
  progress after reload were exercised. No runtime errors were observed; the
  installed rendering library emits a Three.Clock deprecation warning.
- Physical phone pinch gestures, audio, and device frame rates remain manual
  checks. The first version has no multiplayer or cloud saves.
