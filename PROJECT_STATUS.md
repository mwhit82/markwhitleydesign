# Dead Deadly Deader — project status

Updated: 15 October 2026. Specification: roadmap v0.5.

## Current milestone
Phase 10 mobile/tablet support implemented for local review. Landscape touch gameplay uses joystick + swipe-look with explicit interaction; portrait and interruption suspension freeze gameplay. Visual quality remains Standard by default. Physical iPhone/iPad Safari and Android validation remain outstanding. Publication authorised after review on 16 October 2026. See docs/dead-deadly-deader-mobile.md.

## Phase 5 completed
A shared active clock drives HUD/CCTV time and seven scheduled tutorial approaches. The opening 40-second report counts toward the 600-second night; pause/focus loss, replayed news and survival sequences stop night time. One active visitor at a time; overdue approaches wait. At 5:55 AM, completion safely clears pending visitors, blocks stale decisions, releases pointer lock and awards 50 coins once per run. Seven correct decisions plus completion earn 85 coins. Night 1 completion, rewards, cosmetics and settings persist; replay uses a fresh run ID.

A development-only 60-second rehearsal exercises the same timeline without saving coins/completion. Production forces the full 600 seconds. All mode/difficulty selections currently use the Night 1 tutorial schedule; variation is Phase 6 work.

## Phase 5 validation
30 game tests pass, including a complete simulated ten-minute perfect run, seven-arrival limit, save reload, duplicate completion, fresh replay, pending-visitor cancellation, rehearsal reward isolation, pause/focus/news/cutscene timing and defeat precedence at dawn. All 17 Rally tests, the Soccer check, production build, lint and type checks pass.

Browser rehearsal: opening news advanced the clock, the first human was admitted, pausing held 3:57 AM, resuming advanced normally, and dawn completed safely while inspecting the next visitor. Completion showed 5:55 AM, three hearts, one correct decision and 55 practice coins; the real balance stayed 110. Replay reset to midnight/three hearts. Completion layout checked at 1280×720 and 393×852, with no browser errors. A full real-time ten-minute browser playthrough/pacing review is still for Fenn; the full duration and all seven outcomes were tested in the store simulation.

Performance: Apple M4 Pro / 24 GB, Codex in-app browser, development at 1280×720: completed room sampled 120 FPS, 111 calls, 4,398 triangles, 195 geometries and 20 textures, matching the prior cleaned-up room sample. No new rendering assets or targets. Short local sample only, not a mobile or prolonged-soak guarantee.

## Phase 5 playtest decisions and limits
No forced decision timeout yet: waiting visitors block later approaches and leave at dawn without another penalty/reward. Fenn should assess whether this permits overly easy survival and whether a fair waiting rule is needed. Retained first-report duration is 40 seconds rather than the roadmap's provisional 45. Refresh restarts transient night progress; earned coins remain saved. Physical mobile, normal-browser pointer lock and audio listening review remain outstanding.

## Completed
Preserved the fullscreen game, atmospheric room/lobby, worn characters, shop, saved cosmetics, START settings, first-person controls, interactive door, peephole, four CCTV views and DDD News.

Added six data-driven visitors: three humans and three Anomalies with visual, movement and dialogue evidence. The first four encounters teach identification in a fixed order; later choices use a run-seeded pool. Visitors approach on the surveillance stairs, knock, wait for inspection/questions, and depart after a deliberate decision. Only one encounter is active. The solo office has no decorative multiplayer characters.

Three predefined questions reveal consistent human stories or discoverable contradictions. Correct decisions grant five coins; mistakes deduct one trust life. Duplicate/stale decisions cannot award or deduct twice. Accepted visitors wait for the door to open before entering; rejected visitors leave outside. Phase 4 replaces the temporary zero-trust screen with survival presentation and a complete Game Over flow. Manual lock controls are removed during this encounter playtest; guarded LOCKED state remains available for future sequences.

## Phase 4 completed
Pure tension/lunge/recovery sequences, with trust deducted only by the original visitor decision. Mistaken human rejection has its own non-attack consequence. Donut becomes watchful/agitated as lives drop, then performs a stylised final leap, captioned cut to black and Game Over. Results show night, correct decisions, mistakes and earned coins. Retry/lobby reset transient state while retaining progression. Pause and focus loss freeze sequences. Settings persist sound volume/mute, gentle scares, reduced motion, flicker disabling and standard/low rendering. System reduced motion also suppresses lunges/shake. No new external assets, render targets or post-processing.

## Tested
25 game tests pass: transactions, save validation/storage failure, starter persistence, rewards, movement/collision/frame gaps, clock mapping, room/door transitions, news timing, encounter outcome matrix, duplicate/stale guards, fair clue catalogue, approach motion, scheduling/pause, arrival during inspection, departure and fresh-session cleanup. Production build, lint and type checks pass. All 17 Rally tests and the Soccer check also pass in Phase 4. New tests cover sequence order, door gating, frame gaps, pause/focus, exactly-once penalties, fatal/nonfatal outcomes, every-phase lobby cancellation, arrival recovery spacing and settings migration/persistence.

Browser journeys covered news skip, CCTV arrival, peephole framing, all three questions, admitting a human (+5 coins), rejecting a human (-1 trust), rejecting an Anomaly (+5 coins), coin persistence after refresh, pause, scene transitions and a narrow 393×852 inspection layout. Phase 4 browser playthrough deliberately rejected Bea, admitted Milo and rejected Pippa: trust 3 → 2 → 1 → 0, then blackout and Game Over with three mistakes. Pause/resume during a consequence, retry to three lives, retained 110 coins, narrow results/settings layout and saved settings were checked. No console errors in checked journeys.

## Performance
Apple M4 Pro / 24 GB, Codex in-app browser at 1280×720: short room sample at the door measured 120 FPS (about 8.3ms cadence), 111 render calls and 4,398 triangles after departure. Baseline 195 geometries/20 textures rose to 205–206 geometries/22 textures with one visitor and returned to 195/20 after cleanup. CCTV retains its selected-feed-only 15Hz rendering and 720px width cap. These are local development samples, not GPU timings, long memory soaks or mobile guarantees.

## Known issues / validation limits
Successful pointer-lock capture/release needs a normal desktop browser check; the in-app browser denied capture, so drag-look and Escape were checked. Physical mobile/cross-browser checks and audio listening review remain outstanding. Touch gameplay is deferred. Mirror reflection is a static approximation. Existing dependency advisories and non-blocking Three.Clock deprecation remain documented in docs/dead-deadly-deader.md.

Phase 6 supersedes the Night 1-only milestone. Visitors still wait for a decision without a timeout; mode/difficulty variation and the ending are now implemented. Survival cues are deliberately short and stylised; Fenn should assess their intensity and audio. Unrelated rally assets remain untouched; nothing has been published.

## Next action
Review Phase 8 sound mix, scare intensity and atmosphere. Phase 9 is cross-device testing and release readiness, pending approval; publishing remains a separate approval. Nothing has been published; unrelated rally changes remain untouched.

## Phase 6 completed
Three ten-minute story nights with sequential unlocks, replay/continue, separate completion ticks per night and difficulty, night-specific reports and a staged Night 3 ending. Three additional visitor profiles include fair dialogue contradictions. Difficulty adjusts schedules, inspection guidance, dialogue and CCTV noise while retaining three lives. Infinite continues through dawn with capped arrival intervals and persistent best streak, highest night, correct-visitor score and cumulative nights survived. Rewards, milestones and ending state are guarded against duplicates. Existing saves gain additive validated fields without losing cosmetics, currency or settings. Development rehearsals can preview locked nights and never write rewards or completion.

## Phase 6 validation
37 game tests pass, including simulated full-length runs for all nine story/difficulty combinations, unlocks, individual difficulty completions, ending pause/viewed state, Infinite dawn continuity, cumulative records and scaling caps. Production build, lint and type checks pass. The 17 Rally tests and Soccer check passed during this milestone. Browser Night 3 Hard rehearsal showed its own news, Donut framing, THE END… FOR NOW and completion; the saved 110-coin balance was unchanged after refresh. Infinite rehearsal continued into Night 2 at 12:24 AM with three lives, its waiting visitor and 110 saved coins intact, without a completion overlay. The updated START panel also fits at 393×852; the viewport and full-night defaults were restored for review. No browser errors were observed in either journey.

Performance: Phase 6 reuses the existing room, characters, materials and selected CCTV target; no new rendering assets or post-processing. The prior Apple M4 Pro / 24 GB room sample is a baseline, not a new Phase 6 FPS claim. Long-session/device profiling and Fenn’s pacing review remain outstanding. Waiting without deciding still allows survival; this needs an explicit balancing decision rather than an unannounced timeout.

## Phase 7 implementation and validation
Completed the planned checklist: category catalogue; independent accessory ownership/equipping/unequip; combined rotating previews; immediate lobby updates; five achievements with explicit once-only reward claims; v1-to-v2 migration; automated and browser verification; documentation. Four procedural accessories reuse existing wear textures. Menu/shop/results link to achievement progress and rewards. The original five colours and prices are preserved.

43 game tests pass, including legacy migration, invalid slot/ownership sanitisation, affordability/duplicate purchase, independent unequip, five-purchase counting, achievement eligibility, exactly-once claims after reload, non-idle Trust Expert and rehearsal exclusion. Production build, lint/type checks and Soccer regression check pass. Browser checks: 110-coin legacy balance loaded intact, cap purchased once for 60, equip/unequip/re-equip, preview glasses and backpack without purchase, unaffordable backpack disabled, refresh retained cap and 50 coins, dressing-room ownership and keyboard focus. Achievement layout scrolls at 393×852, and the wardrobe preview and purchase/unequip controls fit the same narrow size. No browser console errors observed. The local review save now owns/equips the test cap with 50 coins.

Performance: Apple M4 Pro / 24 GB, Codex in-app browser, development 1280×720 lobby with cap: short sample 120 FPS, 212 calls, 12,522 triangles, 150 geometries, 29 textures. The cap adds two small meshes and reuses the character wear maps; no added texture downloads, post-processing or scene render targets. After wardrobe close/reopen, the main renderer retained 150 geometries and 29 textures; calls vary with camera framing. This is a local short sample, not a universal FPS claim or prolonged soak.

Known limits: full-length balance review, physical-device/cross-browser and audio checks remain. Waiting visitors still have no timeout. Accessories are procedural first-pass art; GLB upgrades remain supported. Migration does not invent old perfect-night history. Triple Threat’s 150-coin reward is the existing design’s story bonus, claimed once rather than silently duplicated.

## Phase 8 completed and tested
Completed checklist: bounded audio service and lifecycle; layered hum/ventilation/quiet moments; movement, question and news cues; reusable character states; three coordinated attack profiles; restrained lighting/grain/shadow/sway/mirror treatment; broadcast styling; persisted resolution/shadows/effects/sensitivity/ambient-volume settings; tests and browser checks. No external assets or speech services were added.

46 game tests pass: settings migration/ranges, neutral reduced-motion poses, bounded monotonic attack profiles, quiet-gap envelope, gesture-gated audio, voice cap, reusable ambient sources, mute/silence/dispose/reinitialisation, plus existing gameplay/progression tests. Production build/lint/type checks and Soccer regression check pass. Browser: new Night 1/3 broadcasts, question response through peephole, correct human admission, later-night Jules admission with a single trust deduction and recovery, pause/mute source cleanup and resumption, settings reload, low preset selection, 75% resolution, narrow settings panel (393×852). No browser errors observed. Rehearsals kept the 50-coin balance and cap intact. Review settings restored to Standard, sound on, sensitivity 1, resolution 1.5, effects/shadows on.

Measured Apple M4 Pro / 24 GB, Codex in-app browser at 1280×720 in development: room after scare recovery 119 FPS, 147 calls, 5,660 triangles, 196 geometries, 20 textures. Lower-resolution lobby with shadows/effects disabled: 960×540 backing buffer, 120 FPS, 131 calls, 9,222 triangles, 140 geometries, 27 textures. Different camera/scene samples cannot be compared as a controlled speedup. Live diagnostics showed two ambient sources while playing and zero on pause/mute, with zero retained one-shot voices. One extra small shadow mesh, reused mirror map, CSS treatment; no full-screen post-processing or extra ongoing reflection pass.

Limits: subjective headphone/speaker mix and scare-intensity review remains for Fenn; automated audio checks validate lifecycle, not sound quality. Full browser coverage of every scare variant, long soak and physical devices are Phase 9 work. Voice dialogue remains optional/deferred; captions and short synthetic responses ship here. Mirror remains a static cubemap approximation. Waiting-visitor balance remains unchanged.

## Phase 9 local release candidate
52 automated game checks pass, including new deadline affordability-independent penalties, all three difficulty timers, pause/focus/news freeze, duplicate protection and unattended Game Over without rewards. Save loading preserves unreadable/future-version data instead of overwriting it; temporary play displays an unsaved warning. WebGL failure probe is tested. START explains desktop controls, local progress and mild scares; coarse-pointer devices receive an unsupported-touch notice. Production build and type/lint checks pass. All 17 Rally test scripts and Soccer regression check pass. Compatible dependency fixes retain Next 15; two production audit findings remain in the Next/PostCSS chain, requiring review before publication. Earlier no-timeout statements in this historical log are superseded. See the release checklist for measured versus outstanding checks.

Phase 9 Chrome production deadline check: countdown visible at 54 seconds, Escape/Resume retained 54 seconds; expiry removed one heart (3 → 2), retained zero test coins, and the next visitor approached. No console errors. Preview is paused for review on loopback port 3001. This isolated test origin owns/equips Shadow Black; it is separate from the development origin save.

## Phase 10 implementation and verification
Shared transient input, independent pointer ownership, analogue joystick, swipe-look, labelled interaction, saved control selection/touch sensitivity, portrait/interruption suspension, safe-area/dynamic viewport layouts, compact news and collapsible inspection questions. Menus remain usable in portrait; returning requires Resume. Main and preview rendering share resolution limits. Existing cosmetics, currency and progression preserved.

56 automated game checks pass; targeted lint and production build pass. Existing Rally and Soccer regression scripts pass. Browser checks covered 667×375/844×390 gameplay and CCTV, 1024×768 results, 820×1180 portrait shop, 1180×820 setup, saved Touch preference, rotation pause, and a touch-interface rehearsal with one correct admission and 55 practice coins. The real 50-coin balance was preserved. Pointer-driven automation is not physical multi-touch validation. No browser errors observed.

Short desktop-only sample: Apple M4 Pro / 24 GB, in-app browser at tablet viewport 1024×768, lobby after returning from rehearsal: 120 FPS, 198 calls, 10,642 triangles, 139 geometries, 27 textures. No mobile performance claim. Physical full-night play, simultaneous fingers, Safari audio/app lifecycle and long-session resource checks remain required before device sign-off.

Publication review: portrait interruption lock fixed and covered by a regression check; 57 game tests pass. Next remains 15.5.28 with a scoped PostCSS 8.5.30 override and zero production dependency advisories. Physical-device checks remain pending.
