# HallowsEve26 v3 — The living Northlands

Single-player browser settlement RTS at `/playground/hallowseve26`. This release builds on the toybox UI and uses the same Three.js/React rendering stack, without new runtime dependencies.

## Campaign and learning

The twelve chapters span October 31, November 1/5/12/19/26 and December 1/6/12/18/23/24. The opening Halloween defence waits through Pip and Captain Holly's introduction. Six pumpkin scouts attack an existing Keep, watchtower and three guards. The following dawn introduces crews. Later chapters advance on defeating the night's raiders; skipped calendar dates provide no free income. Victory requires the final siege and all three camps liberated, with daytime exploration available after the siege.

Preparation lasts 240 simulation seconds in chapters 2–4, 300 in 5–8, and 360 in 9–12. Sunset automatically triggers a wave and restores 1× speed. Pause, 0.5×, 1×, 2× and 4× are accessible in the HUD. Menus, ability previews, hidden tabs and portrait orientation pause simulation. Orders can be issued during manual preparation pause. Fixed 20 Hz simulation retains accumulated time with bounded per-frame work. The intended 60–90-minute campaign remains a design target, not a measured first-player completion time.

Pip explains deliveries, construction, roads and supply bottlenecks. Captain Holly explains combat, wounds, flying witches and liberation. Ordinary lessons are dismissible, throttled and stored in the save, with replay available in the field guide. The opening tutorial alone waits for acknowledgements. Scouts show recommended healthy force compositions and specific gaps; the readiness label is not a win probability.

## Crews and supply chain

There is no automatic job assignment in a new campaign. Assign 1–3 elves to a lumber camp/forest pair or quarry/stone pair, one operator to each sawmill/workshop, and up to three builders to a construction or repair site. Camp-to-deposit range is 13 tiles. Crew slots use actual idle elves; workers cannot be double-booked. Recalled carriers deliver before becoming available. Workers release exhausted/destroyed assignments, shelter at night and resume valid jobs at dawn. Blocked routes are reported rather than crediting imaginary deliveries.

Gathering adds to carried cargo, not shared stock. Deliveries to the Keep or reachable storehouses add spendable supplies. Operators physically collect ingredients and deliver output. A sawmill converts 4 logs into 3 planks; a workshop converts 3 planks and 1 stone into 4 toys, each taking 5 seconds of active work at level one. Recruitment costs, capacity reservation and queues remain deterministic. Cottages provide six spaces and welcome two elves.

Roads are optional and speed friendly path-following workers/troops by 50%. They are not a power or connection network. Gates allow friendly passage and block ground attackers. Witches use direct flying navigation over water and buildings; rangers and watchtowers provide anti-air, while infantry, frost beacons and mortars target ground enemies. Santa's magic can also affect witches.

Building purpose and work times live in `campaign.ts`. Base times with one builder: wall 10s; gate 15s; home/lumber/quarry 45s; store/sawmill 60s; workshop 75s; watchtower/frost beacon 40s; mortar 50s. Roads are instant. Builder contributions are 1.0/0.6/0.4. Estimates report active work separately from travel, waiting or shelter. Construction has foundation/frame/walls/roof/finishing stages, scaffolds, supplies and completion particles.

## Controls and presentation

The HUD keeps resources, population/idle workers, date, sunset, Keep health and speed. Map and large objectives are collapsed. Build, Kingdom, Army and Santa open contextual controls. Select resources to dispatch workers; select a workplace for purpose, recipes, crew status, cargo and actions. A blank ground tap first clears selection; troop movement requires its explicit command. Cast preview shows an ability's effect/range/cooldown; only the separate Cast action uses it. Escape closes the current surface, then cancels actions; Space toggles preparation pause; R rotates placement. All modal headers have fixed close buttons.

Characters use shared articulated toy definitions with render-frame instanced transforms: headings, walking, work tools, carrying, attacking/casting, hit flashes and brief defeat falls. Zombies extend their arms; witches hover/bank on broomsticks; cannons recoil. Menu portraits are regenerated from those definitions. Visible damaged troops have health bars. Reduced effects omit incidental particles and reduce motion/shadow cost. No skeletal model downloads or external asset executables are used.

Music, effects and world ambience have separate saved levels. River noise follows the nearest river section relative to camera focus and zoom; positional work/combat cues pan across the screen and fade to silence at range. World cues are activity-driven, throttled and limited to six voices, reserving two additional slots for combat/UI. Menus mute ambience and duck music. Hidden tabs suspend the context. Assets are local, gesture-gated and optional if loading fails.

## Saves and verification

New saves use `hallowseve26-save-v3`. The loader can migrate validated v2 payloads, preserving the old localStorage entry, resources, buildings, troops and progress. Existing workplace jobs become assignments; migration begins paused, with a fresh preparation timer where applicable. The title offers continuing that kingdom or starting the Halloween story. Invalid saves do not overwrite their source. Preferences retain the existing sound keys. Transient audio and animation state are never serialized.

`npm run test:hallowseve26` covers core campaign/navigation/combat regressions, explicit crew lifecycle and conservation, construction rates, timer progression, tutorial persistence, migration, flying/anti-air, audio lifecycle and deterministic step grouping. Readiness calibration runs twelve wave mixes with three seeds each and the recommended positioned force, without Santa intervention or liberated camps. Those fixtures provision forces directly: they do not certify organic economy difficulty or first-player completion time. A resource-limited automated strategy survived seven chapters but lost in chapter eight after exhausting its original forest and failing to expand plank production. This is useful bottleneck coverage, not proof of a balanced full campaign. Browser interaction checks supplement these fixtures.

Run `npx tsc --noEmit --incremental false` and a production build. Desktop viewport checks are not physical iOS/Android tests. Release-quality mobile performance (30 fps target) and the 60–90-minute first campaign require real-device and external playtesting; do not describe this iteration as a certified AAA release.
