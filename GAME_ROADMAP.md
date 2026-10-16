# The Anomalous — development roadmap

Specification: Full Game Development Roadmap v0.5. Implement sequentially, complete and test each phase, update PROJECT_STATUS.md, report Completed/Tested/Known issues/Performance/Next phase/Decisions needed, then wait for approval. Do not automatically begin the next phase.

## Foundation — complete
Fullscreen route, lazy scenes, lobby movement and collisions, worn cone characters, shop and rotating preview, versioned local saves, START selection, solo horror room, static HUD, initial CCTV, materials, dust and occasional light dips. Preserve these systems.

## Phase 2 — interactive horror room (complete; continuation approved)
- [x] Central pure room/door transition model, used by the store and presentation.
- [x] Raycast targeting with distance and occlusion, E/click prompts, smooth look, pointer lock and drag fallback, reliable Escape/pause.
- [x] Door states CLOSED, VISITOR_WAITING, INSPECTING, OPENING, OPEN, CLOSING, LOCKED; explicit open confirmation; hinged leaf, knob and chain animation; collision and generated sound cues.
- [x] Peephole inspection with smooth camera transition, limited FOV, vignette, exit and restoration. Empty landing until Phase 3 visitor integration.
- [x] CAM 1 Office, CAM 2 Vent, CAM 3 Stairs, CAM 4 Back corridor; shared geometry, only selected feed rendered, capped feed cadence/resolution, labels, desaturation, noise/static and timestamp.
- [x] Reusable Anomalous News data with text, subtitles, optional media, timed segments, previously-viewed skip and replay from the room.
- [x] Preserve saves; migrate additively if required. Test state guards, pause/resume, camera exit/re-entry, collisions, storage failure and broadcast progression.
- [x] Browser flow, narrow layout, resource checks, production build and documentation.
Deliverable: interactive room ready for visitors. Stop for approval.

## Phase 3 — visitors and Anomalies (complete; continuation approved)
- [x] Data catalogue: human and Anomaly appearances, movement, dialogue and discoverable clues.
- [x] One central encounter lifecycle with scripted first encounters and seeded later selection.
- [x] Visible staircase approach, footsteps, knock, waiting/inspection and safe departure.
- [x] Predefined questions, evidence review, explicit decisions and exactly-once outcomes.
- [x] Basic trust deductions and 5-coin correct-decision rewards; full attacks/Donut/Game Over stay in Phase 4.
- [x] Pause/hidden-tab/news guards, restart/lobby cleanup, tests, browser verification and documentation.

Data-driven visitor appearance/movement/dialogue/clues/difficulty; approach → stairs → knock → investigation → deliberate decision → exactly-once resolution. Predefined questions (identity, purpose, origin). Humans natural, Anomalies use fair combinations of visual, behavioural and dialogue tells. One active encounter, configurable scheduling, no arrivals during blocking sequences, scripted tutorial encounters and randomised later pool. Footsteps/knocks, CCTV visibility and safe departures. Tests: classification, outcome matrix, duplicate decisions, scheduling, cancellation and stuck-encounter recovery. Deliverable: playable identification system; stop for approval.

## Phase 4 — survival and Donut (complete; continuation approved)
Central three-trust lifecycle, exactly one penalty per error; short attack/tension/lunge/recovery sequences; reduced flashing/shake/loudness settings. Donut states at 3/2/1/0 lives and cartoon cut-to-black defeat. Game Over stats (night, correct, mistakes, coins), retry/lobby. Pause freezes scheduler and active clock; restart resets transient state without losing progression. Audio/graphics settings. Test all outcome/interrupt/retry paths. Stop for approval.

## Phase 5 — complete Night 1 (implemented; awaiting Fenn’s full playtest)
Monotonic active timer, 600 seconds to 5:55 AM; pause/tab suspension/cutscene handling, configurable 60-second development run. Provisional timeline: news 0–45s, exploration 45–90s; visitors at 90,165,240,315,405,480,555s. First human predictable, first Anomaly obvious. Include news within ten-minute session unless playtesting changes this. Completion safely ends pending encounter, stops arrivals, presents completion, awards 50 coins once and saves. Correct decisions award 5 coins. Test full survival, defeat, replay, persistence and duplicate rewards. Deliverable: PLAYABLE NIGHT 1. Full playtest with Fenn remains outstanding; the user explicitly authorised proceeding to Phase 6.

## Phase 6 — full modes (complete; continuation approved)
Three ten-minute story nights: They're Here, Trust Nobody, The Anomalous. New fair clues/behaviours and increasing challenge. Difficulty changes frequency, clues, CCTV and dialogue while retaining three lives. Night unlocks, replay, per-difficulty completion and ending viewed state. Infinite fair capped scaling, longest streak/night/correct visitors/total nights records. Night 3 news victory, quiet room, Donut glance, vent noise, fade and THE END... FOR NOW. Tests: unlocks, completion, scaling caps, scores and ending idempotency. Stop for approval.

## Phase 7 — progression (complete; continuation approved)
Enhance existing shop, not replace it. Category-based accessories, unequip, previews and immediate player updates. Achievements: First Survivor, Trust Expert, Triple Threat, Night Owl, Fashion Cone; document fair achievable requirements and modest rewards. Versioned migrations preserve coins, owned/equipped cosmetics, completion, achievements, records and settings. Test migrations, purchase guards, exactly-once rewards and reloads. Stop for approval.

## Phase 8 — audiovisual polish (implemented; awaiting review)
Independent audio service: hum, ventilation, footsteps, knocks, creaks, CCTV, quiet/random ambience, plastic/visitor/Donut/scare cues, optional recorded dialogue. Reusable idle/walk/turn/knock/talk/suspicious/attack/reaction animation states. Optimised dust, light flicker (already present), subtle shadows/reflection distortion/sway/grain. Multiple coordinated scares and recovery. Branded night-specific news graphics/subtitles/audio. Quality/resolution/shadow/effects/audio/sensitivity/reduced-motion/scare settings with sensible defaults. Check performance and accessibility. Stop for approval.

## Phase 9 — verification and release (local candidate; device/playtest gates pending)
Automated pure logic tests plus browser journeys for classification, lives, rewards, saves, timers, three nights, Infinite, retries and cosmetics. Geometry/material/texture budgets, selective/cached shadows, lazy scenes, compression where applicable, low-resolution CCTV, transition leak checks and loading checks. Measure actual devices: desktop Chrome/Safari/Edge, iPad/iPhone Safari, Android Chrome where available. Desktop first; designed touch controls or clear unsupported notice. Targets 60 FPS desktop/30 FPS supported mobile are measured goals, not guarantees. Compatibility fallback, no accounts, child-appropriate content, privacy and release checklist. Retain current website/Vercel workflow; no paid hosting or rebuild. Public release only after review.

Local Phase 9 checks and remaining release gates: [release checklist](docs/dead-deadly-deader-release.md). Visible decision deadlines were explicitly approved during verification. No publication has occurred.

## Phase 10 — mobile and tablet support (implemented locally; hardware validation pending)
Landscape joystick + swipe-look, shared analogue input, labelled interaction, portrait menus, explicit interruption/resume, safe areas and short-screen layouts. Visual quality first; existing Low preset is optional. Save control preference and independent touch sensitivity. Desktop controls preserved. Browser checks and 56 automated tests pass; physical iPhone/iPad Safari acceptance and Android hardware testing remain outstanding. See [mobile checklist](docs/dead-deadly-deader-mobile.md). No public release.
