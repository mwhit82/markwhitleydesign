# The Anomalous — game design

Source of truth: Fenn's Full Game Development Roadmap v0.5, supplied 15 October 2026. This extends the completed first slice; preserve the existing Next.js application, art direction, controls, cosmetics and saves.

## Experience
A child-appropriate browser survival horror/social deduction game with battered, rounded plastic cone characters, warm lighting, dirty materials and uneasy humour. Fenn's approved room image establishes the wooden chained door, ceiling vent and ladder, mirror, CCTV, cosmetics poster and Donut's bowl. Other cones in that image were multiplayer examples: the solo office has no idle NPC cones. The original grey/black/neon-green START sketch remains authoritative.

The lobby contains shop, customisation and START stations. During a night the player remains in one office. Stairs and back corridor are surveillance spaces, not additional playable rooms. No multiplayer, accounts, payments, live AI dialogue, backend services or crafting.

## Rules
Normal has three sequential 600-second nights ending at 5:55 AM. Infinite continues with capped, fair escalation. Easy/Medium/Hard change arrival rate, clue subtlety, dialogue and CCTV interference, never the initial three trust lives. Proposed initial rule: trust resets each night, configurable.

Humans must be admitted; Anomalies rejected. Either wrong decision costs exactly one trust life; admitting an Anomaly also triggers a short, non-graphic scare. Each encounter resolves exactly once. Discoverable visual, behavioural and dialogue evidence must support fair decisions. No arbitrary guessing. First encounters are scripted tutorials, later encounters may randomise. Humans thank the player and leave the active scene.

Donut is a yellow goldfish with a small cartoon gun: increasingly suspicious at two lives, angry at one, and delivers a cut-to-black defeat sequence at zero. Avoid realistic injury, excessive flashing and overwhelming sound. Reduced motion/scare intensity and audio controls are required before scares ship.

Initial economy: 5 coins per correct decision, 50 per survived night, 150 bonus for completing the three-night story. Reward events are idempotent. Preserve the existing one-time 150 starter coins and five colour prices (yellow free, green 50, pink 75, blue 100, black 150). Future accessories and achievements extend the existing catalogue.

Anomalous News starts each night, with captions, timing and replay/skip support for viewed reports. Night 1 warns about impostors approaching up stairs and knocking, genuine humans needing shelter, and surviving to 5:55 AM. Text/simple graphics first; voices optional later.

## Decisions and constraints
Phase 2 has no scheduled visitors, active night clock, penalties or rewards. An empty landing is visible through the peephole until Phase 3. Door interaction uses a separate explicit open confirmation. Never imply an empty-room test is a visitor decision. All night/encounter state must have one authority, independent of rendering. Minor implementation choices belong in status/roadmap; flag major game-rule changes for Fenn.

Stop after Phase 5 for Fenn's full Night 1 playtest. Stop after every major phase for review before continuing. Publishing is a separate final release action.

## Phase 3 encounter implementation
The encounter playtest now runs independently of a full night. After news, the first visitor starts approaching after 12 active seconds; approach takes 18 seconds, or 22 for a stop-start Anomaly. Between resolved encounters, Easy/Medium/Hard waits 24/18/12 seconds. These are provisional encounter-test timings, superseded by Phase 5's scripted ten-minute timeline.

The first four visitors are Bea (human), Milo (obvious Anomaly), Pippa (human), Robin (contradictory dialogue Anomaly). A run-seeded pool then includes Sam and Kit. Humans retain ordinary cone features, natural movement and consistent answers; Anomalies have documented visual, motion and/or dialogue tells. Colour alone is never evidence. Three predefined questions can be revisited without changing the answer.

Correct decisions award 5 coins immediately; wrong decisions deduct one trust. At zero trust, an interim session-ended screen offers retry/lobby. Phase 4 replaces this with attack/Donut presentation. No jumpscares or night-completion rewards are implemented here. Encounters wait for a deliberate decision; no automatic timeout or hidden penalty has been invented. A pending visitor at the end of a timed night needs the Phase 5 completion rule/playtest decision.

## Phase 4 survival decisions
Trust deductions remain exclusively in the exactly-once visitor resolution. Presentation follows a pure tension → lunge (Anomaly admission only) → recovery state machine. Wrong human rejection uses tension/recovery without an attack. Surviving restores control and the configured arrival gap; zero trust instead triggers Donut → cut to black → Game Over. Door animation completion is allowed while the sequence blocks other interactions. Pause, focus loss and hidden tabs freeze progress; retry/lobby discard transient state but retain coins/cosmetics/settings. No active night clock is introduced until Phase 5.

Donut is calm at three trust, watchful at two, agitated at one and furious at zero. The final stylised leap cuts to black with a captioned gulp; no gore. Gentle scares remove both lunges and soften their audio without changing penalties or outcomes. Reduce motion also removes camera shake and lunges; system reduced-motion preferences apply. Disable flicker prevents ambient voltage dips. Settings are validated additive fields in the existing v1 save. Low graphics caps pixel ratio at one; existing shared materials, cached shadows and selected CCTV feed are retained.

## Phase 5 — Night 1 timing and completion
The playable default is 600 active seconds mapped to 12:00 AM–5:55 AM. One monotonic, bounded simulation tick advances the clock, news and arrivals. The existing 40-second news report counts within the night; the remaining opening time is exploration until the first approach at 90 seconds. Skipping a viewed report does not jump the clock. Replaying news pauses night/visitor time while the report advances. Pause, focus loss and survival cutscenes stop the night clock; suspension gaps are clamped, never fast-forwarded.

Approaches are scheduled at 90, 165, 240, 315, 405, 480 and 555 story seconds: Bea, Milo, Pippa, Robin, Sam, Kit, Milo. Only one visitor can be active; overdue approaches wait for the prior encounter and a closed door. Difficulty and mode selections are retained, but this milestone runs the same Night 1 tutorial schedule for all selections. Full mode/difficulty variation remains Phase 6.

At dawn, a living player completes the night. Pending visitors are dismissed without a further reward/penalty, interactions stop, pointer lock releases and the results panel opens. A mistake already committed takes precedence: its sequence resolves before the clock can resume, and zero trust never completes the night. Completion grants 50 coins once per unique run ID, records completedNights >= 1 and preserves all cosmetics/settings. Replay is a new run and can earn its own rewards. Refresh abandons transient progress but retains already-earned coins.

A development-only START option runs the same story timeline at 10× speed (60 active seconds), with shortened approaches/departures but normal-length door/scare animation. It cannot save coins or night completion. Production always uses 600 seconds. This rehearsal verifies mechanics, not ten-minute pacing.

Playtest decision: there is no forced decision timeout yet. Waiting visitors block later arrivals and are dismissed at dawn. Fenn's full playtest must decide whether this is too easy or needs a fair waiting/deadline rule before Phase 6; do not silently introduce automatic penalties.

## Phase 6 — full modes
User approved Phase 6 without supplying the requested full Night 1 playtest feedback. Proceed with implementation; the waiting-visitor balance issue remains explicitly open, with no automatic decision deadline added.

Normal mode offers They're Here, Trust Nobody and The Anomalous, each ten active minutes. Completing any difficulty unlocks the next story night; completion is also tracked separately for Easy/Medium/Hard. Existing completedNights saves retain their unlocks without inventing a historical difficulty. Night 1 Easy keeps its seven-visitor tutorial. Later schedules contain 7–13 approaches, with added arrivals by night/difficulty. Difficulty never changes the three-life allowance. Easy supplies inspection guidance, Medium increases arrivals, Hard adds subtler but contradictory dialogue and modest CCTV noise. Essential clues stay available. Ash, Nell and Jules extend the catalogue; ordinary-looking Anomalies must still contradict themselves.

Infinite continues across dawn without replenishing trust or triggering story completion/ending. Its seeded visitor pool reuses fair profiles. Intervals begin at 75/60/48 story seconds (Easy/Medium/Hard), reduce by three per night for at most ten steps, and never fall below 35 seconds. No visitor overlap. Best streak, highest night reached, most correct decisions and cumulative completed Infinite nights persist. Each survived Infinite-night milestone has an idempotent claim ID; no story completion bonus is granted in Infinite.

Night 3 completion triggers 14 seconds of ending presentation: victory news, quiet room, Donut glance, vent sound, fade and THE END… FOR NOW. Pause/focus guards apply; endingViewed is saved only after the sequence finishes, and rehearsal runs do not save it. Completion rewards remain once per unique run. Replays are fresh runs. Development rehearsals can select any story night without unlocking it or saving rewards/records.

## Phase 7 — accessories and achievements
The existing shop now has Colours, Hats, Backpacks and Glasses. Initial accessories: Night Watch Cap (60), Dented Tin Hat (90), Old Shift Pack (80), Round Glasses (40). Preview never purchases or equips; an explicit Equip action applies owned items immediately. One item per accessory category, independent unequip, original colour prices unchanged. The dressing room shows owned items only. Accessories remain decorative and never affect visitor evidence or difficulty.

Achievements unlock automatically from real saved progress; players explicitly claim each reward once in Achievements & rewards (Menu, shop or results). First Survivor: complete Night 1, 20 coins. Trust Expert: finish a story night without mistakes and at least one correct decision, 30 coins (idle survival does not qualify). Triple Threat: finish the three-night story, 150 coins, fulfilling the original one-time story bonus. Night Owl: five completed Infinite nights cumulatively across runs, 25 coins. Fashion Cone: own five purchased cosmetics, excluding free Classic Yellow, 20 coins. No additional automatic story bonus. Rehearsals unlock nothing. Old saves receive evidence-backed achievements on migration; Trust Expert cannot be inferred retrospectively.

## Phase 8 — audiovisual presentation
Local synthesis now combines a low electrical hum and filtered ventilation with smooth eight-second quiet gaps, occasional stereo vent/wood sounds, real player/visitor footfalls, plastic movement, question-response chirps, Donut cues and a short news ident. No generated speech service or external audio download; dialogue remains captioned text. One game-owned audio context unlocks only after input; menus, focus loss, mute and teardown silence sources. Ambient level and master volume are independent.

Reusable cone poses cover idle, walk, turn, knock, talk, suspicious, attack and reaction. Knock/talk gestures last two seconds; pause holds their local clock. Settings/system reduced motion neutralise decorative poses and suppress lunge/sway. Scares share the existing survival clock: Milo rushes, Kit/Jules lean closer, other Anomalies use a two-stage approach. Audio varies with the same profile; one smooth light dip spans tension/recovery. No new penalty or timing rule. Gentle scares retain the original no-lunge behaviour and soften the cues.

Analogue news branding, numbered night cards, short intro fade and scanlines retain readable captions. CSS grain, tiny camera breathing, a rare faint vent-shadow stripe and static bumped mirror reflection add atmosphere without post-processing. Effects can be disabled; Low removes dust/shadows and caps pixel ratio. Resolution (0.75–1.5), mouse sensitivity (0.3–2), shadows and effects persist alongside existing accessibility settings. Default rendering remains capped at 1.5; reduced motion respects system preferences.

## Phase 9 approved deadline rule
A waiting visitor has 60/45/30 active real seconds on Easy/Medium/Hard. The HUD, questions and inspection expose the countdown, with a static last-ten-seconds warning. Missing it keeps the door closed, costs exactly one trust, breaks the streak and gives no coins, regardless of visitor classification. The existing non-attack consequence and Donut/Game Over sequence handle the penalty. Pause, focus loss and replayed news freeze it; rehearsal accelerates approaches but not decision seconds. A completed dawn still dismisses an unresolved visitor without another penalty. This supersedes earlier no-timeout notes.
