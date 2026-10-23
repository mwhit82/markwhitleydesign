# Dead Deadly Deader — first playable slice

Open `/playground/dead-deadly-deader` after `npm run dev`. The Playground card links to the fullscreen game. This is a desktop keyboard/mouse prototype; narrow-screen menus are responsive, but touch movement is deferred. No deployment, accounts, payments or game backend were added.

## Controls and flow

- WASD or arrow keys: move. The lobby camera follows automatically.
- E or the visible interaction button: open Shop, Customise, START or CCTV when nearby.
- Room: click to capture the pointer; mouse looks around. Drag-to-look remains available when pointer lock is denied.
- Escape: close CCTV, close a menu, or pause. Menu also opens pause. Pause offers return to lobby and Playground.
- Window blur and open menus suspend movement.

First play starts as Classic Yellow with 150 welcome coins. The shop previews any colour, purchases with sufficient balance, and equips owned colours. Customisation displays owned colours only and equips on selection. Starter coins are not recurring; earning coins through nights is future work. Normal/Infinite and difficulty are session settings. The room always begins at NIGHT 1, 12:00 AM, three hearts; there is no running night or visitor gameplay yet.

## Code boundaries

- `components/deader/scenes`: independently loaded lobby and room scene modules.
- `components/deader/character.tsx`: procedural rounded cone, face, limbs, animations and optional backpack/selfie stick. Replace the implementation with a GLB component while retaining colour, walking and transform props. Use metres, Y-up, feet at origin, positive Z as the face direction, approximately 1.5 m height. A future GLB should expose body colour material and idle/walk clips.
- `components/deader/controllers.tsx`: keyboard/pointer adapter, interaction proximity, first/third-person cameras. Movement and collision use the independent `move` function; a touch adapter can supply the same normalised direction.
- `components/deader/environment.tsx`: reusable room shell, primitive boxes and locally generated sign textures. Labels do not fetch remote fonts. Procedural cone roughness adds subtle surface wear.
- `components/deader/game.tsx` and its CSS module: menus, rotating preview, modal focus management, HUD, loading and renderer failure UI. `client.tsx` excludes WebGL from server rendering.
- `lib/deader/game.ts`: cosmetic definitions, save validation, transactions, movement/collision, future session/visitor/decision definitions and reward/clock functions. These functions have no React or rendering dependencies.
- `lib/deader/store.ts`: Zustand orchestration and browser persistence; transient scene/UI state is excluded from the save.

Phase 2 adds an independent gesture-unlocked Web Audio service for gentle door/knock/camera sounds, with mute, pause silence and scene teardown. No external audio assets or licences are required.

## Persistence contract

Local storage key: `dead-deadly-deader:v1`. Version 1 stores coins, owned colour IDs, equipped colour, completed nights, Infinite best score and claimed reward IDs. Classic Yellow is always owned. Invalid IDs and negative/non-integer counters are sanitised; malformed JSON or unsupported versions initialise a new save. A valid zero balance remains zero on reload. Storage failures leave the game playable and display a warning. Clearing site storage starts a fresh save; local persistence is not cheat-resistant or synchronised between tabs/devices.

`purchase` refuses unaffordable/duplicate purchases; `equip` requires ownership. `reward` requires a unique event ID and refuses repeated claims. Future gameplay should issue stable reward IDs per run/night/decision. The 600-second clock maps to 5:55 AM; trust remains three across difficulties. Difficulty frequency/subtlety values are provisional configuration and are not active in this room preview.

## Rendering and verification

WebGL 2 is required by the retained Three.js version. DPR is clamped to 1–1.5. There is one shadow-casting spotlight and no post-processing. CCTV switches the existing camera to a live alternate angle; it does not create an extra renderer or render offscreen feeds when closed. R3F disposes scene geometry/materials on removal; generated textures have explicit disposal. The preview canvas exists only while a cosmetic menu is open. Room-specific procedural surface maps and cached static shadows are described below; authored GLB assets remain future work.

Checks:

```sh
node --test scripts/test-deader.mjs
node --test scripts/test-rally-controls.mjs scripts/test-rally-replay.mjs
node scripts/check-soccer98.mjs
npm run build
```

Six game tests cover transactions, save validation and persistence, blocked storage, duplicate rewards, movement/collision/diagonal speed/frame gaps, clock endpoints and session transfer. Seventeen targeted rally tests and the soccer check passed. Production compilation, lint and type checks passed on Next.js 15.5.28. The existing Google fonts require network access for a clean build.

Initial blockout browser verification covered walking to stations, buying/equipping Lime Green, refresh persistence (100 coins retained), Hard/Infinite transfer, first-person room, live CCTV, Escape/pause and repeated room/lobby transitions. START was inspected at 393×852 and desktop at 1280×720. On the local desktop browser, measured frame cadence was approximately 120 FPS. At an identical 393×852 room viewpoint, repeat transitions returned to 84 uploaded geometries and four textures, with 131 render calls and 5,204 triangles; no resource-count growth was observed in that short check. These are desktop measurements at a narrow viewport, not physical mobile benchmarks or a long-duration memory soak.

A transient Drei HTML loading-overlay error found in development was removed; subsequent scene transitions produced no new console errors. Fiber still emits a non-blocking Three.Clock deprecation warning with the existing Three.js release. Unsupported-WebGL fallback and denied-pointer-lock handling are implemented; physical unsupported devices have not been tested.

Next.js and its matching lint configuration were patched within major version 15. The package audit still reports inherited build/dependency-chain advisories (13 total: 11 high, two moderate); a broader dependency audit is separate from this game slice. No forced major upgrades were applied.

## Deferred

Touch gameplay, visitors, anomaly AI, clue/dialogue investigation, active night timing, trust loss, jumpscares, Donut defeat sequence, three-night ending, Infinite progression and reward generation remain future milestones. The mirror uses a low-resolution room reflection captured once on entry; it does not track moving objects or the player in real time. Hats/accessories can extend the category-based catalogue; only colours are purchasable here.


## Room art pass — single-player correction

Fenn clarified that the yellow and green cones in the reference represent multiplayer participants. They have been removed from the solo room, together with their collision volumes. The lobby character and shop displays remain. The shared CCTV location drives its interaction radius and collision footprint; the ladder now has a physical blocker too.

The room has a separate lighting/material rig from the lobby. Seeded 512px colour and relief maps add timber grain, narrow staggered floorboards, mottled plaster, hairline wear and tarnished metal. Materials and maps are shared across the room's meshes. The door has recessed panels, hinge hardware, a brass knob and linked chain; the desk has open legs; the vent, ladder, CRT and bowl have additional detail. The ceiling is lower and the CCTV camera was lowered to stay inside it. The monitor is closer to the foreground framing in the reference.

One warm shadow-casting spotlight provides the main pool of light. Low-cost fill lights, a feathered translucent light shaft, 48 drifting dust points and a CSS vignette provide atmosphere without a full-screen post-processing chain. Dust motion respects reduced-motion preferences. A 128px cubemap is captured once per room entry for the mirror/glass/brass/metal; capture targets and derived textures are disposed on exit. The reflection is a static approximation, not expensive live planar reflection or refractive glass. Surface textures are generated locally; no image assets, dependencies or remote texture requests were added.

The room's title branding is hidden during play so the night/time/trust HUD stays small. This art pass does not enable visitors, scares, multiplayer or active night gameplay.


Art-pass validation: production build, lint/type checks and all seven game tests passed. The new test verifies that the former multiplayer positions are traversable and the relocated CCTV desk remains collidable. Browser checks covered solo entry, CCTV, room/lobby cycling and the HUD at 1280×720 and 393×852. At the same desktop starting viewpoint, two clean room entries each settled at 158 geometries, 19 textures, 138 draw calls and 7,452 triangles, with approximately 120 FPS and no console errors. Counts include prefiltering resources, while draw counts are the steady scene after capture. These are short desktop observations, not physical-mobile or prolonged-soak guarantees.

The static room shadow map is rendered once on entry rather than every frame. When moving shadow-casting visitors are introduced, explicitly invalidate the shadow map or enable updates during their motion. A retained automatic cubemap prefilter target was found during repeat-entry QA; the room now owns and disposes the prefiltered target and generator explicitly. A development-only stale context-loss listener was also corrected by removing it on canvas teardown.

### Lobby and character weathering pass

The lobby now shares the horror room's procedural plaster, wood, floor and metal materials. Added low timber wall panels, door panels and hinges, inset counter fronts, mirror framing, aged signs and warm caged ceiling fixtures. Station locations and collision footprints are unchanged. One 1024px live shadow light follows the moving character; other lights cast no shadows. Dust uses 48 points and there are no added post-processing passes.

`character-wear.ts` generates deterministic 256px neutral albedo and relief textures. The Cone uses them for grime, rim abrasion, paired scratch edges, roughness and subtle bump relief. Cosmetic colour remains a material tint, so the same weathering appears on the player, display models and rotating shop/customisation previews. Textures are disposed when each Cone unmounts. Future GLB replacements should supply equivalent UVs and wear maps or reuse the colour/animation component interface.

Validated on an Apple M4 Pro MacBook Pro (24 GB), Codex in-app browser, development build at 1280×720: lobby 120 FPS (about 8.3 ms/frame), 210 draw calls, 12,234 triangles, 148 geometries, 29 textures. Geometry/texture counts matched before and after a lobby → room → lobby cycle, including opening and closing the shop preview. This is a local sample, not a universal performance guarantee. Narrow 393×852 rendering checked; desktop movement, shop previews and START transition checked; no browser errors. All seven logic tests and the production build passed.

Lighting now includes occasional voltage dips in both scenes (`use-light-flicker.ts`). After the first six seconds, each dip lasts 0.42 seconds with an irregular 8–20 second pause; brightness bottoms out at 62% rather than blacking out. Bulb emission and its light change together. Ambient and station lighting remain steady, reduced-motion preference disables the effect, and hidden-tab time is ignored. The effect changes existing intensities only, retaining the room's cached shadows and adding no textures, geometry or render passes.


## Phase 2 — interactive room

The maintained specification and current status are now in root `GAME_DESIGN.md`, `GAME_ROADMAP.md`, `PROJECT_STATUS.md` and `ASSET_GUIDE.md`. They supersede first-slice descriptions above where extended.

Room interactions use `lib/deader/room.ts` for pure door/view/broadcast definitions and the existing Zustand store as authority. Door transitions are guarded and incoming visitor IDs can resolve once; Phase 3 must integrate decision outcomes with this authority rather than add parallel encounter state. No actual visitor is spawned in Phase 2. `room-controller.tsx` handles smooth first-person view, raycast targeting and a centre prompt. E or click opens controls, opening requires a separate confirmation. Escape exits inspection/CCTV, otherwise pauses. The peephole shows an empty landing until visitors arrive in Phase 3.

`room-door.tsx` animates the existing panel leaf outward, turns the knob and drops the chain; it invalidates cached shadows only while moving. Closed-door collision and office bounds prevent walking out. `surveillance.tsx` contains non-playable stairs/corridor/vent geometry; its lights are isolated from office cameras. CCTV switches the one existing renderer, caps width to 720px and updates at 15Hz. It restores normal resolution/cadence on exit and unmount. There are no continuously rendered inactive feeds. Timestamp stays at the static night-preview time.

`room-ui.tsx` presents news, door/inspection and camera controls. News has timed caption segments, optional future image/audio metadata and a 40-second first report. Pause and hidden-window state freeze it; viewed reports can be skipped and replayed from the monitor. Save v1 is extended additively with validated `viewedBroadcasts`; previous coins, colours and reward IDs survive. Full authored media playback, visitor visuals, running nights and consequences remain later-phase work. See PROJECT_STATUS.md for latest validation and limits.


## Phase 3 — visitor identification

`lib/deader/visitors.ts` owns the pure catalogue, questions, approach timing, seeded scheduling and outcome rules. The Zustand store coordinates these with the existing door state, pause/news guards and persisted reward claims. `components/deader/visitors.tsx` presents the single active visitor and sound cues; `encounter-ui.tsx` presents questions, outcomes and interim zero-trust results. Character appearance variants remain optional props on the shared Cone replacement interface.

A fresh session uses a unique run ID; persisted claim IDs include that run and encounter to prevent duplicate rewards. Transient encounters are not resumed from local storage. Existing v1 coins, cosmetics, progression and viewed broadcasts remain intact. Correct identification earns five coins; mistakes remove one of three trust lives. The first arrival is after 12 active seconds, approaches last 18 seconds (22 for stop-start), and subsequent waiting intervals are 24/18/12 seconds for Easy/Medium/Hard. News, pause and loss of focus freeze encounter progress. A waiting visitor has no deadline in this phase.

Use CCTV to watch movement, E at the door to inspect, and the three question buttons to collect dialogue evidence. LET IN requires confirmation; REJECT resolves directly. Escape leaves inspection or pauses play. No idle multiplayer characters have been reintroduced.

All 21 game tests and the production build pass. Browser checks verified human admission, mistaken human rejection, correct Anomaly rejection, persisted coins, arrival while inspecting, question answers, narrow layout and visitor resource cleanup. See PROJECT_STATUS.md for measured hardware/results and limits. Full trust-loss presentation, attacks, Donut defeat and persistent settings belong to Phase 4; the active night clock belongs to Phase 5.

## Phase 4 — survival and Donut

`lib/deader/survival.ts` defines the pure presentation lifecycle and validated settings. Mistakes are still resolved exactly once by visitor logic. The store freezes encounters while the sequence runs, lets the door finish opening, clears the visitor after recovery and either resumes the arrival interval or advances Donut → blackout → terminal Game Over. Retry creates a fresh room/session and keeps saved rewards/cosmetics/settings. The timed night remains Phase 5 work.

The room controller blocks movement/interactions during consequences, frames the Anomaly or Donut and adds a small, optional shake. Donut's movement reflects remaining trust. Both lunges are removed by gentle scares/reduced motion, including system reduced-motion preference. Captioned cues remain available when muted. Pause settings include sound volume/mute, gentle scares, reduced motion, flicker disabling and standard/low rendering. Low caps DPR at 1. Settings are additive to v1 saves, defaulted and validated without resetting owned items or reward claims. The modal focus trap now includes sliders, checkboxes and selects.

Tests cover sequence order, door gating, pause/focus freeze, invalid/frame-gap deltas, terminal state, both wrong-decision paths, once-only trust loss, retry/lobby cleanup and settings migration/persistence. See PROJECT_STATUS.md for final browser validation and measurements.

## Phase 5 — playable Night 1

`lib/deader/night.ts` owns clock advancement, the seven-arrival tutorial timeline and completion rewards. `RoomState.night` is transient; START creates a fresh 600-second night. The existing 100ms visitor simulation now also advances the night and broadcast, replacing the separate UI news timer. HUD and CCTV read the same clock. Pausing, hidden/focused state, replayed news and survival sequences are coordinated before advancing; deltas are bounded to avoid catching up after suspension.

The first report lasts 40 seconds, included within the night. Approaches begin at 90/165/240/315/405/480/555 seconds, with the first human and obvious Anomaly fixed. An occupied doorway delays later arrivals without creating overlaps. Dawn removes any pending visitor without an extra decision, blocks stale actions, closes the door and presents completion. A completed run claims `night:1:<run UUID>` exactly once, adds 50 coins and marks Night 1 complete. Correct decisions retain five-coin rewards. The existing v1 save format needs no new fields; transient night state is not persisted.

Local development START includes a 60-second rehearsal selector; production excludes it and forces 600 seconds. Rehearsal scales story/news/encounter time by ten, leaves door/scare sequences readable, and saves neither decision coins nor completion. Leave the selector on Full night for Fenn's playtest. Infinite and difficulty selections are retained but use the Night 1 schedule until Phase 6.

Automated checks simulate a full ten-minute perfect run (seven correct decisions, 85 total coins), repeated completion, save reload, fresh replay, defeat at the dawn boundary, pending-visitor cancellation, schedule limits, pause/focus/news/cutscene timing and reward-free rehearsal. Full human pacing review with Fenn is mandatory before extending modes/nights.

## Phase 6 — modes, records and ending
`night.ts` now includes session number/mode/difficulty, story schedules and capped Infinite intervals. `progression.ts` validates additive v1 fields (`completions`, `infiniteRecords`, `endingViewed`) and owns unlock/record operations. Coins, owned/equipped colours, old completedNights, infiniteBest and reward claims survive migration. Global story unlocks allow switching difficulty; ticks in START show completion on the selected difficulty.

The START screen selects/replays story nights or Infinite and explains difficulty differences. Later news reports are keyed by night, preserving skip/replay semantics. The visitor catalogue adds Ash (human), Nell and Jules (Anomalies); hard dialogue variants retain a provable contradiction. Easy displays general investigation guidance; CCTV static remains modest at every setting. Rendering still uses one active visitor and one selected CCTV feed.

Infinite keeps elapsed story time across dawn, derives current night and wraps the displayed clock. Trust and streak remain in the same session; difficulty acceleration caps at 35-second intervals. Records update on decisions, dawn and defeat. Cumulative survived nights use `infinite-night:<run>:<night>` claim IDs to avoid duplicates across refresh/retry. Infinite does not grant Normal completion or trigger the ending.

The Night 3 ending advances in the shared simulation with pause/focus guards. It reuses the existing room, Donut and synthesised sound service and adds no render targets or external media. Its viewed flag is persisted after the full sequence; development rehearsal is excluded. Rehearsal permits any story selection solely for local validation; production continues enforcing unlocks and 600-second nights.

## Phase 7: accessories, achievements, v2 saves
`lib/deader/cosmetics.ts` defines accessory categories, prices, validation and pure purchase/equip operations. Existing colour operations remain compatible. `Cone.outfit` accepts independent hat/backpack/glasses slots; visitors do not inherit the player outfit. Replace the procedural accessory meshes inside Cone with GLBs at the same local anchors when art is ready. Keep previews and lobby on this same interface.

Save payload version is now 2. The stable storage key remains `dead-deadly-deader:v1` intentionally so existing browser saves are found. `readSave` accepts v1/v2, sanitises and migrates to v2; hydration persists it. New fields: `ownedAccessories: AccessoryId[]`, `outfit: {hat,backpack,glasses}` with nullable validated owned IDs, `achievements: AchievementId[]`. All colour, coins, settings, night/completion/record and claimed reward fields are retained. No starter regrant on migration.

`achievements.ts` owns eligibility and claim logic. Unlocks happen on real night completion, Infinite milestones, purchases and hydration. A perfect-night unlock additionally requires at least one correct decision, no mistakes, and a completed full story night. Claims use stable `achievement:<id>` entries in existing `claimedRewards`, avoiding a second reward ledger. Closing/reopening/reloading cannot pay twice. Triple Threat pays the specified 150-coin story bonus; other rewards are 20/30/25/20. The explicit claim leaves base completion results accurate. Storage failure remains visible.

Menu → Achievements & rewards lists requirements and claim buttons; shop and results also link there. Category previews never mutate saved appearance. Buy then Equip; Unequip removes just that category. Dressing room filters owned items. Mobile menus scroll; gameplay remains keyboard/mouse.

## Phase 8 architecture and controls
`GameAudio` owns global gesture listeners and a 100ms presentation-only update loop. `RoomAudio` owns a single AudioContext, at most 12 one-shot voices and a two-source ambient bed, with explicit node disconnection. Room unmount silences; Game unmount disposes. Playback is optional and gated; no audio is required to identify a visitor. Master/ambient volume, mute and gentle scares apply. Pause/hidden/focus guards stop sources; resume builds a fresh bed without replaying scare phases. Development-only DOM audio diagnostics expose source counts, never saved data.

`presentation.ts` contains pure characterPose, scareVariant/attackAmount, ambienceLevel and renderScale helpers. Gesture animation uses capped local time, not absolute wall time. Existing Survival phases continue to synchronise trust, movement, cue and light envelopes. Settings and OS reduced-motion disable decorative movement; gentle scares suppress travel/shake and soften audio; flicker-disable prevents the light dip.

Save version stays 2 with additive validated settings: ambience 0–1, sensitivity 0.3–2, resolution 0.75–1.5, shadows/effects booleans. Old settings get defaults. Low caps render scale to 1 and disables shadows/dust. Standard respects resolution and shadow preference. CCTV remains selected-feed-only at 15Hz/720px; stable main DPR avoids resetting feed resolution on unrelated state changes. Effects toggle controls dust, grain, camera sway and shadow stripe. Mirror bump is static.

News uses a short reduced-motion-aware ident fade, night number graphic, captions and synthesised ident; prerecorded speech is deferred. Settings are accessible from Menu and scroll on narrow screens. Phase 8 tests cover ranges/migration, poses/profiles, envelope and mocked WebAudio lifecycle; browser source-count checks complement these, but subjective listening and cross-device validation remain required.

## Phase 9 release preparation
Run `npm run test:deader` for the game suite. Deadline lengths live in `DECISION_SECONDS` in visitors.ts; timeout is an explicit encounter outcome, distinct from reject. It never earns coins and is resolved once. Decision timers use capped real active seconds, including development rehearsals. The existing dawn-dismissal rule is unchanged.

Persistence now checks raw save readability/version before writing. Invalid JSON, non-object data or unknown versions stay untouched; a temporary default save can be played with a visible unsaved notice. Storage exceptions also surface that notice. Valid v1/v2 saves retain normal migration and validation. No account, cloud save or telemetry was added. Compatibility probing safely handles unavailable/throwing WebGL drivers and releases the probe context.

See [release checks](dead-deadly-deader-release.md) for remaining device, security and playtest gates.

## Phase 10 touch support
Touch gameplay is now implemented in portrait and landscape: left joystick, right-side swipe-look and labelled interaction button. Prior desktop-only/touch-deferred notes above describe earlier milestones and are superseded. Control settings default to Auto; visual defaults remain unchanged. Actual page/app departures suspend active time until explicit Resume; rotation and temporary focus changes clear input without a modal. Gameplay and menus work in both orientations. See [mobile architecture and device checklist](dead-deadly-deader-mobile.md). Hardware support is pending real-device verification; viewport simulation does not establish mobile performance.

### In-room TV and mobile interaction update
The earlier full-screen news/intro flow is superseded by an animated TV above Donut, with local sound and light. Reports loop independently at real-time speed, including rehearsals; sessions start directly in exploration. Legacy broadcast-history save fields are retained without gating play. Door choices and countdown remain fixed while questions scroll. Both admission and rejection require confirmation tied to the current visitor. See the mobile document for input-reset and interruption behavior.

## TV selection, holding lounge and scare update

Select **Watch TV** (aim + E, mouse interaction or labelled touch button) for subtitles and a framed view. **Back to room** / Escape hides them immediately. Watching does not pause clocks, visitors or deadlines. An **Answer the door** shortcut appears while someone waits. The peephole action now also says **Answer the door**. Both televisions share a single animated broadcast texture and timeline; one spatial audio stream follows the nearer screen.

The rear office doorway leads into a 12-seat lounge. Correctly admitted humans enter once, follow the aisle, sit and watch TV. Residents are transient, keyed by encounter ID, with entering/seated/leaving phases. They reset with a fresh night/session; once full, the oldest resident leaves through the lounge exit before the incoming resident uses that seat. Anomalies retain their survival sequence and do not enter the resident roster. A shared wear texture and lower-detail resident cones limit resources. Office and lounge movement use a connected boundary and chair collision geometry.

CCTV adds **Door rear** and **Holding lounge**, sharing the existing renderer. Lobby touch swipes and desktop mouse drags orbit the visible player; movement follows camera yaw, with camera elevation limits and obstruction checks. Existing input reset and pointer ownership remain in force.

Admitted anomalies trigger a camera-relative cone face rush (0.15 seconds) and brief close-up within the existing 0.65-second lunge phase. A bounded layered synthesized scare replaces the old soft tone. No additional trust penalty is introduced. Gentle scares use a smaller static reveal and quieter sound; reduced motion removes rush/shake; no strobe is added. The attack retains visitor colour and third-eye identity.

Development setup offers full-lounge and anomaly-at-door fixtures only for the existing 60-second no-reward rehearsal. Production sessions always use standard arrivals. No save migration is needed.

## Faster night pacing
Production nights now last 300 active seconds (five minutes), while the clock still spans 12:00 AM–5:55 AM using 600 internal story units. The 60-second development rehearsal remains reward-free. Night 1's first visitor starts approaching after six real seconds and knocks around 15 seconds. Its seven story arrivals are now at internal times 12, 90, 170, 250, 330, 410 and 480; later nights/difficulties retain their visitor counts with arrivals distributed from 12 through 480. Infinite uses the same five-minute night clock and earlier opening arrival. Waiting decision timers remain 60/45/30 real seconds. Pauses and survival sequences still suspend the night clock; rewards, saved progression and the displayed clock mapping remain unchanged.

Validation: 71 tests pass, including exact 300-second completion, first knock at 15 seconds, unchanged real-time decision deadlines, all story/difficulty schedules, Infinite milestones and reward eligibility. Production build passes.

## Tutorial, sidekicks and console arcade (October 2026)

- Tablet-size touch controls use a 176px move circle and 64px thumb when both viewport dimensions are at least 600px. Travel is derived from the measured control, including phone sizing. Shop/customisation have fixed Back to lobby and purchase controls around a scrolling catalogue.
- The lobby tablet beside START launches guided practice. Actual movement, look, tablet interaction, peephole inspection, all three questions, Door rear camera, admitting Bea and viewing TV advance the steps. Wrong choices invite a retry. Tutorial state is transient and exits to the lobby; its scripted encounter has no night timer, deadline, scare, rewards or achievements. `rewardsAllowed` centralises real-night eligibility.
- Sidekicks: Pip (50), Patch (75), Shadow (100). These are equal-ability colour variants of Fenn’s triangular puppy drawing. Buy, then equip in Sidekicks; unequip there or in customisation. Pet meshes use procedural worn plastic, no additional renderer or shadow caster, and do not block players. They trail the physical player rather than the CCTV camera.
- Save v2 gains `ownedPets: PetId[]` and `equippedPet: PetId | null`. Missing fields default empty/null, unknown IDs and duplicates are removed, unowned equipment is rejected. The localStorage key and existing balances/progression are retained; no extra starter grant. Tutorial and arcade runs are not saved.
- Pets bark on arrival. `petHint` selects only visual/CCTV clues from sources actually viewed and never reads hidden visitor classification. One hint per encounter; dialogue-only evidence remains the player’s responsibility. Silence never certifies safety. Existing sound settings govern cues.
- CCTV now opens a console choice. Impossible Shift is an original 45-second single-button runner with a handcrafted, tested traversable level. Tap/click the playfield or hold Space/Jump to jump again on landing. Mistakes restart only the arcade; there are no coins or trust penalties. Original code, art, level and synthesised sounds; no imported commercial assets. Inspiration: https://store.steampowered.com/app/251630/The_Impossible_Game/ . The researched Vita port is a native port, not a browser engine: https://github.com/MetalSyntax/The-Impossible-Game-vita .
- Night scheduling continues behind the arcade. A knock switches to the console with the live decision countdown and Answer the door. The run is retained in memory and resumes only explicitly with a three-second countdown after the visitor leaves. Menu/focus/view changes release held jump input. Survival and dawn take precedence. Returning to lobby or starting another night discards the run.
- Arcade simulation lives in `lib/deader/arcade.ts` and uses bounded substeps; rendering is a lazy 2D canvas with responsive framing with identical world-space physics in either orientation. The underlying 3D room is capped while the arcade is open. `Puppy` is the procedural replacement point for a future GLB pet; `pets.ts` owns catalogue/ownership/evidence rules separately.

## The Anomalous — dawn judgement (local review, October 2026)

Normal nights last 300 active seconds; ordinary consequence scares no longer stop the clock. At dawn, the six-second Auditor sequence judges the **shift's** mistake count: 0–2 passes, 3+ fails. Completion coins/unlocks are awarded only after a pass. Successful shifts get a surprise scare too; failures use a gunshot and blackout without gore. Existing gentle-scare/reduced-motion options apply. Infinite judges each five-minute shift, resetting the mistake baseline and six-shot ammunition only after a pass, while keeping cumulative records.

The shelf on the office's left wall holds a six-shot handgun. Look at it and interact to collect it. Fire using the labelled button (touch or desktop), a click while mouse-locked, or a stationary click with drag-look. A swipe/drag does not fire. Door choices include **Open doorway to aim**, which leaves the visitor waiting and keeps the deadline running. Close the doorway to reconsider. Walls/closed doors block hits. Only visible waiting visitors and lounge residents are targets; Donut, pets and the Auditor are excluded. Hits disappear immediately. Shooting an unresolved Anomaly earns five coins; shooting a human adds a mistake. A resident cannot pay again, and shooting an admitted Anomaly does not undo the admission mistake. Shots are disabled in menus, cameras, TV, arcade, tutorial and judgement.

Visitor identities come from seeded shuffled bags of all nine existing characters, avoiding repeats even at bag boundaries. Pacing targets 10/12/14 opportunities on Easy/Medium/Hard; long decisions reduce the actual number. Approaches never overlap, there is a breathing gap after departures, and no new approach starts in the final fifteen seconds. First knocks vary with walking style, around 15–17 seconds. Guided practice stays scripted.

Correct decisions now produce a prominent +5 coin notification as well as updating the balance. Automated production-duration checks confirm persistence after refresh and duplicate prevention. Sixty-second development rehearsals intentionally do not pay; the browser preview labels these practice coins. No production reward failure was reproduced, so no speculative balance migration or retroactive grant is applied.

Lobby music is an original gesture-unlocked synthesized loop, controlled by existing volume/ambience/mute settings, with bounded audio sources and cleanup. Pets render at 65% world size, wander/rest nearby and follow breadcrumb positions through the same collision rules as the player. The supplied Unc picture is retained unchanged at `/deader/unc.jpg` and framed using cropped UVs in the holding lounge.

`judgement.ts` owns pure judgement/ammunition helpers; the room owns transient judgement, ammunition, removed-target IDs, per-shift mistake baseline and coin-toast state. Saved progress continues to use the existing v2 schema/key. Development-only rehearsal choices include an armed doorway and passing/failing dawn, gated to non-saving 60-second sessions. Production builds never expose these fixtures.

Validation: 84 game tests, TypeScript/ESLint and production build; browser checks at 390×844, 844×390 and 820×1180 include touch-style aiming, one-hit removal, ammo spending, music source lifecycle, framed art and both dawn outcomes. The pre-existing Three.Clock deprecation warning remains. Physical iPhone/iPad multi-finger handling and subjective audio/scare intensity still need device playtesting. No publication in this change.

### Fenn playtest correction — end-only scares

Mistakes and timeouts now record their outcome without starting the old survival/lunge sequence or playing the gulp cue. Admitted Anomalies walk to the lounge like other visitors. All judgement scares remain at dawn. The gun retains its original side-wall shelf position, finish and sign, as preferred after playtesting. Added a regression test covering both early wrong decisions through three mistakes, continued movement/CCTV and eventual dawn failure. 85 tests pass; production build passes.

### Fenn playtest correction — held gun, shelf return and empty landing

The first-person gun now includes the cone character's black plastic hands and forearms, stays within portrait framing, and updates after the player camera. Its meshes cannot obscure interaction targeting and are drawn above nearby walls. The original side-wall shelf offers **Put gun back** while carrying it; collecting it again preserves ammunition and shot history. TV reports explicitly warn that each night becomes more dangerous. Opening an empty landing automatically closes the door after the opening animation, allowing subsequent visitors to arrive instead of leaving the scheduler blocked. Regression coverage includes Night 3 empty-door recovery and returning/recollecting a partially used gun. Physical phone/iPad appearance still needs playtesting.

## Hourly specials and Stalker direction — local review, 19 October 2026

The shop keeps its regular catalogue and adds one hourly special: Mystery Prop (50 coins), Headphones (75), Mini Anomaly (100), or Glitch Particles (100). A stationary worn cone beside the supply counter holds a live countdown sign. Walk up and interact, or deliberately point and trigger in VR. Proximity does not open a menu. The same offer is accessible from the shop; VR categories remain limited to four buttons per page, with Sidekicks/Accessories under More items.

`lib/deader/hourly-shop.ts` selects deterministically from the UTC hour using the fixed `anomalous-specials-v1` seed. Each of four items can repeat into the following hour. Device wall time is intentional; there is no server/anti-cheat clock. The countdown continues while away and is refreshed on focus/visibility. Purchasing revalidates both the displayed hour and item, including same-item repeats across the boundary. Ordinary accessory/pet purchasing cannot bypass the special rotation. Ownership is permanent, duplicate buying is blocked, and Purchase/Equip remain separate. Owned specials are always available in the wardrobe.

The existing save-v3 accessory and pet IDs/slots accommodate these additions without resetting or migrating balances. Headphones replace the hat, Mystery Prop replaces the hand prop, Glitch Particles replace the effect, and Mini Anomaly replaces the sidekick. Held weapons suppress hand props, including in reflected character presentation. Mini Anomaly is a small worn cone with bounded fragments; it follows the existing pet trail/wander logic and gives only observed-clue hints. New effects have twelve fragments, no extra lights, and respect effects/reduced-motion settings. Preview rendering distinguishes the new companion from puppies. Development-only item selectors preview all four without permitting fixture purchases or changing ownership.

The Stalker now hangs upside down in the vent/lounge cameras and peeks sideways at the rear door and lounge entrance. Other feeds remain eligible, with the previous timing/reward rules unchanged. Face coordinates follow the full model transform; gaze dismissal requires the front of the face and clear line of sight. A room candidate must face the player's side of the doorway. A short, softened cymbal swell plays once per camera observation and once per room appearance, without replay on feed revisits. The source is deadrobotmusic's CC0 **DR Cymbal 10** (Freesound 591637); provenance and adaptation are in `public/deader/stalker-cymbal.LICENSE.txt`. It loads locally after audio unlock and fails silently if unavailable. Withdrawal keeps its existing quiet scrape.

Validation: 131 automated tests cover hourly boundaries/repeats, affordability, stale purchases, duplicate ownership, ordinary-shop bypass prevention, save round trips, independent equipment slots, explicit VR entry, cue keys and front-facing gaze. TypeScript and targeted ESLint pass. Browser visual checks covered desktop, 390×844 phone, 844×390 landscape and 820×1180 tablet menus, all four item previews, explicit stand opening, insufficient-funds state and the cymbal's successful audio decoding. Physical touch hardware was not retested. Browser balances were insufficient for the live featured item; successful purchase/refresh semantics were verified through automated save round trips rather than claimed as a completed browser purchase.

### Dawn visitor procession and twelve hourly specials (October 2026)

Decision classifications, coin gains, mistake totals and streak feedback are hidden during active shifts. Investigative clues remain, including Donut/pet visitor hints. Donut's idle animation and the VR wrist display no longer expose accumulated mistakes. The Mimic keeps its mid-night lounge event and never joins the dawn procession.

`Encounters.ledger` holds transient identity/profile snapshots, decision, coins, shot state and mistake contribution. Resolving or timing out a visitor appends once; shooting an admitted resident updates the same entry. Residents carried over from a previous Infinite shift can get a new zero-reward removal entry. No active ledger is persisted. Decision coins settle at dawn through existing reward claim IDs (also on failed shifts); abandoning a shift before dawn forfeits pending coins. Rehearsals remain reward-free.

Dawn cancels unresolved arrivals, freezes room events, and presents resolved visitors in order. Humans get contextual captions; living anomalies get the textured three-second scare and recorded scream; shot anomalies get translucent ghost presentation and taunts. Shot humans have regretful captions. Only the current visitor and two queued visitors are rendered. The Mimic and staircase victims are excluded. Next advances one visitor; Skip moves directly to the four-second verdict without changing rewards or mistakes. The existing fewer-than-three-mistakes rule remains. Infinite clears the ledger for its next shift. Desktop/mobile frame the doorway; VR stages the procession in a fixed doorway in front of the player with the controller menu off to the side, without moving the headset camera. Pause and focus loss freeze progression.

Eight new original procedural specials join the existing four: Bent Halo (hat,75), Midnight Crown (hat,75), Static Specs (glasses,60), Moon Patch (face,50), Lost Signal Pack (backpack,100), Pocket Moon (hand,75), Porcelain Cracks (finish,100), Shadow Moths (effect,100). Prices are earned coins. One deterministic offer per UTC hour; repeats remain possible. Catalogue expansion changes future hourly selections. Ownership uses the existing v3 save slots; no migration/reset. `new-special-details.tsx` supplies shared preview/lobby/reflection models, worn materials and a 256px porcelain texture. Moths are capped at six, respect effects/reduced-motion settings, and hand props yield to the gun. No remote generation or asset-loading dependency is added.

Development judgement-pass/fail fixtures include a human, living anomaly, killed anomaly ghost, kids and an excluded Mimic. The local test toolbar is collapsible for responsive review. New unit coverage includes ledger identity/reward rules, timeout and Mimic exclusion, ghost captions, skip/pause, failed-shift settlement, VR menu visibility, prior-shift resident removal and all cosmetic slots/save round trips.

Validation: 138 automated tests pass, targeted game lint and TypeScript pass, and production build succeeds. Browser review covered 390×844 portrait, 844×390 landscape, 1024×768 tablet, and Quest-controller emulation. Landscape captions sit to the right to preserve the visitor view. Next was activated with an emulated controller trigger; Skip reached the verdict on touch/desktop. On this Apple M4 Pro host, sampled lobby rendering was 120 fps (~8.3 ms/frame); the same VR-emulator lobby returned to 102 geometries / 25 textures / 160 calls / 4,148 triangles after repeated procession transitions. These are local samples, not physical Quest measurements. A development hot-reload hook warning occurred during editing; a fresh load and subsequent checks produced no additional browser errors. Physical Quest comfort, device audio and sustained headset frame rate remain manual playtest checks. Production HTTP checks passed for home, Playground, The Anomalous, existing game routes, and the legacy Anomalous redirect.

### Impossible Shift collision correction

Spikes use the same triangle vertices for drawing and collision, replacing the old rectangular lethal region. A convex polygon separating-axis check tests the cube at its rendered rotation. The shared 0.65-unit cube size removes the prior drawing/physics mismatch; a 0.025-unit inset on each cube edge forgives near-grazes. Existing block landing, level layout, speed, jump tuning and bounded 120 Hz substeps remain. Regression tests cover both empty upper spike corners, tip/slope contacts, rotated-cube empty corners, slight grazes, the former invisible-hit scenario through the simulation, and full-level completion.

### Kitchen survival (local, October 2026)
- Kitchen doorway is on the right side of the holding lounge. Only the fridge and oven are interactive, using E/touch or explicit Quest pointer + trigger; proximity never opens a menu.
- Each shift starts with 100 hunger/thirst. Empty in 210/120 active seconds respectively. Free drinks restore thirst; carry one meal, cook for 20 seconds, then collect/eat to restore hunger. Free supplies do not touch saved coins.
- Collect within 40 seconds of readiness. Final 15 seconds show smoke, an alarm and a fire countdown. Switching off discards food. An unattended oven causes a three-second fire presentation and Game Over. Empty needs immediately end the shift. Previously banked purchases/coins survive; pending visitor rewards are forfeited without revealing their identities.
- `lib/deader/kitchen.ts` owns pure rules, deadlines and shared room-floor bounds. `RoomState.kitchen` is transient: no save schema change. The shared simulation ticks needs in CCTV, appliance, peephole and arcade views; pause/focus suspension stops it. Dawn wins exact expiry ties; earlier failures in the same tick still lose. Dawn cancels the oven; Infinite rollover resets needs.
- Tutorial adds a fridge/cooking practice step. Practice holds needs full and stops the oven before danger. Local 60-second rehearsal fixtures `kitchen` and `kitchen-fire` exercise appliance targeting and fire presentation without saved rewards.
- Quest wrist shows hunger/thirst, clock and oven status; appliance screens have at most three explicit actions. Phone/desktop show labelled meters and oven countdowns. Smoke has bounded geometry and a reduced-effects variant; no new shadow-casting lights or forced headset movement.
- Validation: 151 tests pass, including full-night bots that use real fridge/oven actions, needs depletion, fire timing, pause guards, dawn ties, Infinite replenishment and VR appliance menus. Browser checked fridge → cook → eat, portrait 390×844, landscape 844×390, tablet 1024×768, fire → Game Over, and empty browser error log. On this Apple M4 Pro, kitchen samples were 117–120 rendered frames/second (~8.3–8.5 ms frame interval); these are desktop diagnostics, not Quest GPU measurements. Physical Quest comfort/performance still requires headset testing.
- Repeated kitchen → lobby → kitchen checks held at 291 geometries / 31 textures over three runs; no browser errors. Home, Playground, The Anomalous, Rally and Soccer98 returned 200; the legacy game route returned 308. Quest emulator rendered the new kitchen and wrist meters; full controller appliance interaction was not confirmed in that emulator session and should be checked on the physical headset.

### VR visibility, dawn appearances and action icons

The reflected player and all descendant cosmetics/particles use dedicated layer 8 (`render-layers.ts`), avoiding Three.js XR eye layers 1 and 2. Only the mirror camera enables that layer. Controller hands, weapon, wrist and pets remain on their existing layers. Mirror hand cosmetics remain visible when unarmed; the reflected gun takes their place when armed.

`scare-appearance.ts` maps the current dawn ledger snapshot to monster colour, third eye, wide mouth, split body and glitch arm. Each reveal derives fresh flags; human/ghost reveals are excluded. Existing timing, recorded screams, comfort options and fixed VR viewpoint remain. The development `dawn-looks` rehearsal covers four differently coloured anomalies.

`action-icons.ts` is the explicit shared action registry for the installed Hugeicons outline collection. DOM icons retain labels and are decorative to screen readers. VR draws the same selected local vectors through a bounded Path2D cache in `canvas-icons.ts`, without remote assets or extra render targets.

Validation: 156 targeted tests pass; production build/type validation and game lint pass. Browser spot checks confirmed shop icons and the dawn monster sequence with no logged errors. Automated layer tests cover both XR eye masks and newly mounted particles. Full responsive layout, repeated-transition resource measurements and physical Quest outfit/mirror/comfort checks remain to be completed before release.

### Clear glass menus and calmer needs (24 October 2026)

Shop and Locker use compact titles and a top-right coin badge. Menus use roughly 68–70% black glass; icons inherit foreground colour. Door admission/rejection acts immediately with live-encounter guards, checkmark/green and no-entry/red buttons. VR uses the same meanings and direct decision path. Pause prioritises Return to game.

Hunger drains over 420 active seconds, thirst over 240. Shared constants also drive dawn deadline comparisons. Warnings begin at 50%, urgent at 25%. Door and peephole views hide needs without pausing their simulation; oven timings and fire are unchanged. Fixed meter/number/warning slots prevent resizing. The peephole question panel uses available height. Responsive shop grids constrain intrinsic canvas widths to prevent sideways overflow.

Validation: 157 tests cover needs, deadlines, warning thresholds, visibility and direct VR decisions alongside existing regressions. Browser checks covered portrait shop (390×844), landscape shop (844×390), tablet (1024×768), full-height peephole questions and immediate rejection. Initial icon-registry wiring error found in browser/type checks was corrected; production build and lint pass. Physical Quest contrast/comfort and full controller playtesting remain manual release checks. No save migration or GitHub push in this change.

### Compact headers and solid VR preview (24 October 2026)

Shop/Locker now provide their own accessible Modal header: icon-only Back to lobby, independently centred title, coin badge and (Shop only) a clock shortcut. Categories immediately follow this row. The existing Hugeicons registry supplies the clock for regular and VR actions.

VR menus use a static 15px lightbar instead of drag instructions, retaining the original larger grab hit area. Either controller hovering the handle or an active drag brightens it; these states invalidate the canvas texture. No animated glow is added.

VR preview characters are portalled into a separate scene with original materials and normal internal depth testing. A priority-2 pass renders after the base scene/menu and clears depth only, restoring autoClear in finally. During judgement the existing DawnFace pass owns the base render; otherwise the preview pass renders it. No render targets, cloned character materials, or headset-pose changes are introduced. Portal children are unmounted on preview/VR transitions.

Validation: 159 tests pass, including render order/state restoration on failure and lightbar state. Production build, TypeScript and targeted lint pass. Browser checked the compact phone header, clock navigation and desktop header; the VR emulator showed the text-free lightbar without browser errors. Full rotating-outfit preview, both-eye occlusion, controller drag and sustained resource measurements still require headset/emulator follow-up; these are not claimed as verified on physical Quest. Changes remain local alongside the preceding UI work.
