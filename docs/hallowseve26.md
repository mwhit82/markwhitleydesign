# HallowsEve26 v2 — The Northlands

A browser-based, single-player settlement RTS at `/playground/hallowseve26`.
The v2 release replaces the original at the same route. No account, server-side
campaign state, multiplayer, external asset service or new runtime dependency.

## Playing

Begin with the Christmas Keep, a cottage, storage, lumber camp, sawmill, quarry
and eight elves. Build workshops, recruit troops, construct fortifications and
liberate three Halloween camps. The island has four biome regions, a river and
two bridges. Daytime lasts until the player chooses Begin Night. Nights stop
construction, gathering and recruitment. Win by surviving night twelve and
clearing all three camps; destroying the keep loses the campaign. The final
siege may be won before the last camp is liberated, leaving daytime exploration.

Harvesting consumes finite deposits. Elves physically carry raw materials to
storage, factory ingredients from storage to production buildings, and finished
goods back. Storage is a shared settlement inventory; local storehouses shorten
journeys. Sawmills consume 4 logs for 3 planks; workshops consume 3 planks and
1 stone for 4 toys. Repairing consumes wood and stone. Cottages provide six
population spaces and welcome two new elves. Shrines rescue two more, subject
to housing capacity. Recruitment queues reserve housing immediately. Population is capped at 120
followers for a bounded browser workload. Sealed workshops retain completed
recruits in the queue until an exit is available.

Troops: nutcracker infantry, snowball rangers, present artillery. Select a troop,
a type-specific squad in Army, or the entire army. Move, Attack and Guard orders
use the bottom command bar, followed by a destination tap. Attack orders engage
camp buildings. Guards and towers automatically engage enemies. Cleared camps
remove their guards, award a one-time supply cache and reduce nightly reinforcements.
Santa automatically attacks nearby enemies, heals troops with Cheer and grants
a ten-second damage reduction with Blessing. He recovers at the keep if defeated.

## Controls and mobile

Landscape gameplay; portrait pauses and offers settings/exit options. Tap to
select, drag to pan, pinch to zoom, two fingers to pan/zoom together. Mouse wheel
zooms. R rotates placement; Escape closes the top panel/action before opening
pause; Space toggles pause outside native controls. Build placement requires an
explicit confirmation. Roads/walls allow repeated placement until cancelled.

One modal panel state prevents stacked menus. Modal headers never scroll away;
all have a labelled close button, focus containment, Escape and backdrop exit.
Building inspection has its own fixed close header and scrolling content.
Menus, portrait orientation and background tabs pause the simulation. Settings
include sound, 1×/2× speed, reduced effects and a measured frame-rate readout.

## Implementation

- `simulation.ts`: deterministic 20 Hz simulation, shared stock, per-factory
  inventory, carrier cargo, housing, recruitment, contextual orders, camp state,
  cooldowns, seeded waves and navigation grid. Cached occupancy; bridges cross
  blocked river cells. Friendly units pass gates, attackers breach obstacles.
- `world.tsx`: original code-authored instanced geometry: pitched roofs,
  turreted keep, cottages, industrial props, animated limbs/cargo, smoke,
  vertex-coloured terrain, flowing river surface, bridges, vegetation and camps.
  Geometry is grouped by shape/material. Shadows and light counts reduce with
  the effects setting. No downloaded models, textures, scripts or fonts added.
- `game.tsx`: command-driven controls, minimap, one modal controller, workforce
  overview, simulation scheduling, background/portrait handling and device saves.

The simulation is fixed-step; actor targets update with the UI snapshot
at approximately 15 Hz and instance positions interpolate between snapshots.
The renderer runs independently. This is not skeletal
animation or a full commercial RTS engine. Campaign length depends on preparation
and speed settings; the two-to-three-hour target is not yet playtest-validated.

## Saves

`hallowseve26-save-v2` is separate from `hallowseve26-save-v1`. V1 saves are never
read as v2 or overwritten. Autosave every 15 seconds, phase transitions, menu
opening, tab hiding and explicit return. Loading validates version, array bounds,
finite numbers, actors, stock, building kinds and orders. Corrupt saves fail
closed without erasing the original. Audio preference remains
`hallowseve26-muted`. Nothing is uploaded.

## Verification

Run `npm run test:hallowseve26`, `npx tsc --noEmit --incremental false` and
`npm run build -- --no-lint`. The targeted simulation tests cover resource
conservation, delivered production, housing, recruitment, construction, river
navigation, gate breaches, troop orders, camp rewards, abilities, saves, final
victory and defeat. The all-wave fixture uses an explicitly provisioned late-game
fortress; it verifies campaign progression, not organic difficulty balance.

Browser QA includes desktop and landscape-phone viewports, construction,
recruitment, menu dismissal, portrait orientation and save restoration. Physical
iOS/Android devices and Safari are not available in this environment; do not
represent viewport checks as device testing or a guaranteed mobile FPS result.
See `hallowseve26-assets.md` for dependency screening and limitations.

Production QA: 1280×800 desktop, 844×390 landscape phone, 393×852 portrait.
The in-app browser reported 120fps in the opening settlement and first night
on the host computer; this is not a physical-phone benchmark. No runtime errors
were observed; the existing renderer emits a Three.Clock deprecation warning.
Targeted ESLint did not complete in this environment and was stopped; TypeScript,
simulation tests, diff checks and production compilation completed.

## Toybox UI and audio

The build catalogue uses generated model portraits, inspectable unavailable cards, missing-material counts, fixed close/site actions, and a real translucent model placement preview. Resources, commands and recruitment use illustrated icons and model portraits. The catalogue scrolls internally on small landscape screens; Escape cancels the active menu/placement. Portrait orientation retains the existing rotate/settings escape route.

Music and effects begin after interaction and respect saved mute/volume settings. New users start with sound enabled after pressing Play; existing mute preferences remain intact. Day/night loops crossfade over three seconds; menus duck music and silence workshop ambience, hidden tabs suspend the context. Music and SFX sliders plus nine-second track previews are in Pause. Network/decoder failures are nonfatal. Effects are throttled and capped at eight concurrent voices. Construction ambience attenuates relative to the camera's ground target.

Simulation notifications use a bounded WeakMap queue. They are not serialized; resuming a v2 save cannot replay historic construction/upgrade/recruit sounds. Completion notifications appear only at the construction threshold. Save version and resource balance are unchanged.

Validation: `npm run test:hallowseve26` includes campaign/save coverage and event/audio lifecycle checks; `npx tsc --noEmit --incremental false`; production build. Browser QA includes existing-save resume, phone landscape catalogue/category/close controls, desktop layout, sound controls and portrait fallback. No claim of human audio audition or a whole-repository security audit is made.
