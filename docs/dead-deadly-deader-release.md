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
