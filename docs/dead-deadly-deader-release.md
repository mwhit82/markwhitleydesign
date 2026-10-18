# Dead Deadly Deader — local release checklist

15 October 2026. Phase 9 local candidate, not public-release approval.

## Delivered
- Visible waiting deadline: Easy 60 seconds, Medium 45, Hard 30. Last-ten-second text warning, no flashing. Timeout costs one trust, resets streak, awards nothing and keeps the door closed. Existing non-attack consequence leads to Donut/Game Over at zero lives.
- Countdown appears in exploration/CCTV and questioning/inspection. Pause, focus loss and replayed news freeze it. Decision time remains real time in rehearsals. Dawn dismisses unresolved encounters as before.
- Corrupt or unsupported save versions remain intact rather than being overwritten. Temporary play shows an unsaved warning. Normal v1/v2 migration, ownership and balances remain supported.
- WebGL failure handling tested; desktop-only controls and unsupported touch gameplay explained. Mild scares and browser-local progress disclosed before START.
- Compatible dependency fixes applied without changing Next 15 or the deployment workflow.

## Verification
| Check | Result |
| --- | --- |
| Game logic | 52 passing tests, including all nine full-length story/difficulty simulations, Infinite, cosmetics, saves, audio lifecycle, deadlines and unattended defeat |
| Deadline guards | Both human/Anomaly expiry, 60/45/30 seconds, capped frame gaps, pause/focus/news freeze, no duplicate penalty or reward |
| Build | Production build, integrated lint/type validation passed |
| Existing games | All 17 Rally scripts and Soccer check passed after dependency updates |
| Chrome production | Chrome 155.0.8059.82, Apple M4 Pro / 24 GB; lobby → START → room → pause → lobby → shop; Shadow Black purchase/equip and zero balance retained after refresh |
| Narrow menus | Earlier 393×852 checks covered START, settings, wardrobe, achievements and results; physical-device testing remains outstanding |
| WebGL fallback | Injected absent/throwing driver checks passed; actual unsupported device not available |
| Pointer lock | Automation did not capture pointer lock in Chrome or in-app browser; successful native capture/release remains a manual check |
| Countdown browser check | Production Easy displayed 54s; Escape paused, Resume retained 54s. Expiry reduced three hearts to two, left coins unchanged and allowed the next approach, with no browser errors. Screenshot: /private/tmp/deader-phase9-deadline.png |
| Browser errors | No errors in checked Chrome production journey; existing Three.Clock deprecation warning remains |

## Performance evidence and limits
The current deadline adds text and pure state updates, no meshes, textures or render targets. Existing pixel-ratio limits, reusable materials, selective shadows, lazy scenes and selected-only 15Hz/720px CCTV remain.

Latest measured baseline is Phase 8 on Apple M4 Pro / 24 GB, in-app browser development 1280×720: 119 FPS (about 8.4ms cadence), 147 calls, 5,660 triangles, 196 geometries and 20 textures after scare recovery. These are short local samples, not GPU timings or universal FPS claims. Phase 7 wardrobe reopen retained 150 geometries/29 textures in the main lobby renderer. A prolonged Phase 9 transition/memory soak is still outstanding.

## Release gates
- Fenn: full ten-minute Night 1, all three nights/ending and Infinite pacing; assess new deadline lengths and headphone/speaker scare intensity.
- Manual desktop pointer-lock capture, Escape release and re-entry; Safari/Edge.
- Physical iPhone/iPad Safari and Android Chrome rendering/menu checks. Touch gameplay is intentionally unsupported.
- Long session and repeated-transition resource soak on target hardware.
- Dependency review: final production audit still reports two findings (one high, one moderate) in Next's nested PostCSS chain. Full development audit reports seven findings (six high, one moderate), including the lint dependency chain. Compatible fixes reduced the initial production count from five to two. Forced framework upgrade/downgrade was not applied. Assess/remediate before public release.
- Owner approval for publication, followed by the existing Vercel workflow and a deployed smoke check.

## Reproduce locally
Run `npm run test:deader`, `node scripts/check-soccer98.mjs`, each `scripts/test-rally-*.mjs`, and `npm run build`. Development and production use separate build directories. The production test preview uses loopback port 3001; ordinary development remains on port 3000.

No accounts, multiplayer, cloud saves, new telemetry or external art downloads were added. Unrelated Rally assets are preserved. No publishing performed.

## Phase 10 update
Touch implementation supersedes the unsupported-touch notice and desktop-only scope described above. See [mobile support](dead-deadly-deader-mobile.md). Game suite now has 56 passing checks. Physical touch-device validation remains a release gate; no publishing has occurred.

## Publication review — 16 October 2026
The owner requested review and publication through GitHub, superseding the earlier local-only restriction. Review fixed a portrait interruption that could downgrade the rotate lock to a resumable pause, and updated stale desktop-only Playground/README wording. Added a regression test (57 passing game checks). Pinned Next's nested PostCSS to 8.5.30 with a scoped npm override, retaining Next 15.5.28; production audit now reports zero vulnerabilities. Five high-severity development-only lint-chain advisories remain; no forced framework change was made.

Physical iPhone/iPad/Android validation, long device soaks, manual pointer-lock and Fenn's full pacing/audio review remain limitations, not claimed completed. Release includes only Deader, its website integration, dependencies and documentation; unrelated Rally assets are excluded. A clean temporary checkout is used because the original checkout contains an invalid duplicate Git reference. Original local work is preserved.

## Fenn’s visitors and bundles — local review, 18 October 2026

This update is local only; publication needs a separate GitHub push request. Five-minute nights, existing touch controls, bloodless effects and dawn judgement remain.

- Encounter profiles now snapshot seeded names, colours and coherent cover stories. The pools contain 24 names and 12 story sets; names do not repeat within a shift and adjacent character types differ. Dialogue anomalies retain authored contradictions without obvious appearance-denial answers.
- Mimic and three-kids decisions both grant the normal five-coin reward once. The Mimic reports as an ordinary visitor at admission and has no Donut/pet warning. Three later resolved visitors (including timeouts) advance its lounge-only transformation; the attack removes at most one seated resident, then it leaves. Shooting cancels its sequence; dawn cancels unfinished events. Kids retain the human shooting penalty.
- Splitter uses vertical halves, tilting separation and red connective rubber strands, informed by the decoded supplied video. Glitched uses a displaced arm and bounded fragments. Seeded repeating tells start within eight seconds, with sustained reduced-motion poses.
- Seeded paired arrivals consume two existing visitor slots. The companion waits for its own door timer. Rare pushes remove the victim without a missed-decision penalty; the aggressor is an Anomaly with CCTV evidence.
- Rainbow and Injured bundles cost 150 coins each and unlock four independently removable pieces. Purchase and equip are separate. Finish/effect slots are exclusive; particles are bounded. Save v3 migrates v1/v2 without resetting progress, using the original storage key. Active encounters are never persisted.
- The locally hosted wooden-grip Service Pistol is CC0 by Mateusz Sadek / Poly Haven. Its approximately 2.4 MB GLB uses at most 1K textures and no displacement. Shelf and held instances share geometry/textures; held materials avoid near-wall clipping. Source attribution is in `public/deader/service-pistol.LICENSE.txt`. Rebuild with Blender and `scripts/prepare-anomalous-pistol.py`, supplying the source glTF and output GLB paths. Loading has a procedural fallback.

Development-only 60-second rehearsals expose Mimic, Splitter, Glitched, kids, pair, push, Rainbow and Injured fixtures. They do not save encounter rewards. Pure rules live in `lib/deader/{visitors,night,lounge,cosmetics}.ts`; scene presentation is in the matching components and the new visitor-cone, stair-companion and bundle-details components.

### Validation

- 96 game tests pass, including identity consistency, 500 seeded arrival plans, special decisions, duplicate rewards, every Mimic stage/cancellation, pair deadlines/victims, bundles and save migration. Lint, production build and whitespace checks pass.
- Browser checks covered desktop 1280×720, portrait 390×844, landscape 844×390 and tablet 820×1180 layouts. Verified shop previews, disabled unaffordable purchases, Rainbow purchase/equip and refresh persistence on an isolated local origin. Existing local player currency was preserved.
- Verified pistol load/fire/return/recollect with five rounds remaining; Splitter/Glitched peephole rendering, paired CCTV rendering, Mimic admission, repeated lobby/room transitions and rehearsal dawn. No browser errors appeared in the checked flows. Detailed Mimic attack timing and staircase removal are covered by pure/state tests; their full animation/audio sequences still benefit from Fenn’s playtest.
- Apple M4 Pro (12 CPU / 16 GPU cores), 24 GB RAM, in-app development browser: sampled 115–118 FPS (about 8.5–8.7 ms frame cadence). Armed room samples used 280–288 geometries and 31–33 textures across transitions; scene-dependent calls varied with view/visibility. These are short samples, not a controlled leak soak, GPU timings or physical-phone performance claims.
- Physical iPhone/iPad Safari checks, extended resource soak, positional-audio listening and real-device pointer-lock behaviour remain manual release checks. The asset-load fallback was inspected in code, not tested by intentionally breaking the asset request.

Unrelated Rally assets were left untouched by this update.

## Dawn scare and styling revision — 18 October 2026 (local)

Dawn now uses shared timing constants: 3.6 seconds of judgement, a three-second distorted cone close-up, then one second of blackout. The camera-relative face has large red pupils and uneven teeth, with bounded shaking; player aim is never changed. Gentle scares retain distance and suppress shaking, reduced motion suppresses shaking, and no strobe was added. The dedicated synthesized scream lasts three seconds, respects mute/volume/gentle settings, is bounded to the audio voice limit and stops on pause, focus loss or leaving. It does not replay after resuming. No admission scares were added; dawn reward logic is unchanged.

The existing pistol geometry now uses a cached, simplified charcoal/brown atlas and the character wear relief, with plastic roughness and very low metalness. Shelf and held instances share textures while retaining separate depth settings. The Injured finish now builds a closed ring mesh with two cylindrical bite recesses through its upper-right silhouette, replacing the attached damage shapes. Geometry is memoized per equipped finish and disposed on removal; normals and removed sections have regression tests. Other outfit pieces and save v3 are unchanged.

Validation: 98 tests, targeted lint and production build pass. Tests cover delayed results, both dawn outcomes, motion settings, three-second audio allocation/cleanup/muting, and removed bite surfaces with outward normals. Browser review covered the rotating Injured preview, desktop/portrait dawn sequences and portrait/landscape/tablet weapon layouts; firing reduced ammo from six to five. No browser errors were captured. A short armed-room sample after repeated rehearsals on the same M4 Pro / 24 GB development host measured 114 FPS (~8.8 ms cadence), 146 calls, 14,278 triangles, 280 geometries and 30 textures. This is not a physical mobile benchmark or extended leak soak. Headphone/speaker intensity and physical-device comfort still need Fenn's review. No GitHub push performed for this revision.

## Textured scare, recorded scream, armed reflection and lounge inset — local

The dawn face now renders in a separate depth-tested 3D scene with textured standard materials, directional highlights, volumetric eyes/teeth, wet gums and blood trails. This deliberately supersedes the earlier bloodless dawn-face styling at the owner's request; general visitor disappearance rules are unchanged. Camera-relative scale keeps the eyes and mouth visible on portrait displays. Three-second timing, gentle scares, reduced motion and dawn-only triggering remain.

Dawn and the Mimic's positional scream use a locally hosted human recording, `dawn-scream.wav`: SFX by Dan Knoflicek, "Scream 1.wav" from https://opengameart.org/content/screaming (CC BY 3.0). A continuous three-second excerpt was normalized, endpoint-faded and converted to 22.05 kHz mono PCM. Attribution and modification details are included in settings and `public/deader/dawn-scream.LICENSE.txt`. Gesture unlock preloads/decodes the file; unavailable audio stays silent rather than substituting synthesis. Sources stop on pause/focus loss/exit, respect mute and volume, and stay bounded.

The mirror includes a physical held pistol and supporting hands while equipped, with the same shared model/material styling. The camera-relative first-person weapon is hidden only during mirror rendering to avoid a second floating gun. A reflection-only fill light improves readability. The development-only "Gun · mirror check" rehearsal starts opposite the mirror and never changes production spawn or saved rewards.

A live holding-lounge picture-in-picture appears when the Mimic reaches its transformed stage, with a countdown, walking directions and an optional lounge-camera button. It does not move the player or take over the camera. Transformation lasts 15 seconds, victim removal happens after 12 seconds, then departure takes five seconds. The inset follows the existing resident state, clears on cancellation/removal/dawn, and pauses with the game. It uses the existing WebGL renderer with one 256×144 target at at most 10 Hz; no extra WebGL context. Mirror recursion and first-person weapon rendering are excluded from the inset.

Validation: game tests cover the extended Mimic timing, no-penalty victim handling, alert lifecycle, cancellation, recorded-audio preload/muting/cleanup and offline silent fallback. Browser review verified the textured portrait close-up, live lounge inset following a resolved visitor, and the reflected held gun without a duplicate floating weapon; no captured browser errors. Physical-device performance and listening to the scream on Fenn's headphones/speakers remain playtest checks. No publication performed in this revision.
