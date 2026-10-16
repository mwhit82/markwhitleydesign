# Phase 10 — mobile and tablet support

Touch gameplay is implemented for local review. Physical iPhone/iPad Safari sign-off and Android hardware testing are outstanding. This is not verified on every mobile device.

## Controls
Portrait and landscape gameplay use a left joystick, full-view swipe-to-look in the room, and a labelled interaction button. The lobby retains its follow camera. Movement has a 15% dead zone and proportional speed, with existing collisions and diagonal speed cap. Movement/look pointers own independent gestures; a third finger can tap interaction. Release ends pointer ownership; completed swipe deltas are rendered once, while cancellation and scene transitions clear pending input. Swipes never activate objects.

Settings offer Auto, Touch, or Keyboard and mouse, plus separate touch sensitivity. Auto follows input type. Visual quality stays Standard by default; saved choices are preserved, with Low available. The cosmetic preview respects the same resolution cap.

Both orientations support gameplay. Returning from another app requires Resume; rotating or resizing clears input without a modal. Active clocks, decisions and survival sequences honour suspension. No background catch-up occurs. Fullscreen and orientation-lock APIs are not required.

## Architecture and saves
`lib/deader/input.ts` supplies transient axes, keyboard state, look deltas, pointer ownership and reset operations to both controllers. TouchControls owns pointer capture and lifecycle events. Store state adds transient touchActive and suspension (interrupted/null), separate from menus/focus and never saved.

Existing v2 saves gain validated settings.controls (auto/touch/keyboard, default auto) and settings.touchSensitivity (0.3–2, default 1). No version bump, currency reset or progression changes. Only gameplay surfaces disable browser gestures; menus retain scrolling and document zoom is not globally disabled. Safe-area padding and dynamic viewport height accommodate browser chrome.

## Verified locally
- 56 game tests: existing gameplay plus analogue movement/dead-zone bounds, pointer ownership/cancellation/reset, migration and suspended night/encounter/survival guards.
- Browser touch UI at 667×375 and 844×390: joystick movement, station activation, door/peephole/question/admission flow and practice rewards.
- Rotation to 390×844 froze the broadcast at 12:23 AM; returning required Resume.
- 1024×768 results/lobby, 820×1180 portrait shopping, 1180×820 setup; saved Touch preference and 50 coins retained after refresh.
- Swipe changed the camera without interacting; joystick approach and labelled button opened CCTV.
- Short landscape news and peephole layouts adjusted after visual inspection.
- Automation used pointer/mouse input on touch controls, not a physical touchscreen. Simultaneous fingers and real mobile lifecycle still need device checks.

## Physical acceptance checklist
Record model, OS/browser version, graphics settings and results for each iPhone/iPad:
1. Full touch-only lobby/shop/customisation/START journey, including purchase/equip/reload.
2. Move/look together and add an interaction tap; release fingers in either order; interrupt with rotation, app switch and screen lock. No stuck movement or accidental actions.
3. Inspect, ask all questions, admit/reject, switch all CCTV feeds, replay news, expire a deadline, retry Game Over and return to lobby.
4. Complete a ten-minute night; review later nights, ending and Infinite controls. Check audio unlock/resume and headphone/speaker levels.
5. Both landscape directions and full portrait gameplay, notches/home indicator and browser bars. Essential controls must remain reachable.
6. At least 20 minutes and ten room/lobby transitions. Record frame-time samples, resource counts and slowdown; target sustained 30 FPS or better. Try Low if Standard falls short without silently changing defaults.
7. WebGL/context loss recovery: cosmetics/progression survive reload; transient runs restart.

Desktop simulations are not mobile FPS evidence. Android Chrome uses the same controls but remains unverified on hardware. Native apps, gamepads, multiplayer, offline installation are deferred. No public deployment in this phase.

## Portrait update
The rotation lock is removed. Portrait has lower thumb controls, compact HUD, a scrollable bottom questions panel, two-column CCTV controls and wider lobby/room framing. Swipe sensitivity uses the shorter viewport dimension so rotation does not change its feel. Orientation changes and browser-bar resizes clear held input without pausing. Only actual page departure requires Resume. Saves are unchanged.

Browser verification uses simulated viewports, not physical mobile hardware. The physical checklist above remains outstanding.

## Mobile interruption, door and TV update
Normal resize, rotation and temporary window blur now clear input without a Resume modal. Only page hiding/app departure suspends until Resume. View transitions synchronously discard movement; keyboard repeats cannot restore held movement, and disappearing touch controls release captures. The game prevents text selection/callouts while retaining scrollable menus and usable inputs.

Door decisions use a fixed large timer and action area with two-tap confirmation for admission/rejection. Questions scroll independently and expand one answer at a time. Pending decisions are tied to a visitor ID and cannot apply after timeout or departure.

DDD News is now a looping in-room TV above Donut. Sessions begin in exploration and TV playback does not gate visitors or night progression. Its reusable 768×432 canvas texture updates at 12 Hz (6 Hz on Low); no additional scene render is used. One local light has no shadows and obeys reduced-flash/motion settings. Audio attenuation and stereo position use the physical player pose even during CCTV. Nearby players looking at the TV get readable captions. Legacy broadcast-history save fields remain compatible.

Verification: 61 game checks, type check and production build; browser rehearsal verified direct room entry, in-room TV/captions, rotation without a Resume prompt, portrait/landscape door layout, cancelling rejection and confirming admission. Physical iOS/Android multi-touch and background lifecycle checks remain necessary; browser simulation is not device performance evidence.

## Swipe responsiveness fix
The look surface now fills the room view behind joystick and action controls. Menu remains above it; informational HUD passes gestures through. Completed swipes retain their last movement until the next frame, including after implicit capture release. Height-only browser toolbar resizes preserve gestures, while width changes reset input for rotation. Sensitivity is fixed at gesture start. Touch rotation follows the finger directly rather than using desktop camera smoothing.

Validation: 63 tests and production build pass. Portrait browser checks verified left-side swiping, full-view hit area, Menu access and no console errors. Physical iPhone multi-touch, Safari toolbar and perceived latency checks remain outstanding.

## Lounge / TV / scare verification

TV captions now require explicit selection. The lobby also accepts full-view swipes, orbiting the character while the joystick moves relative to camera direction. Six CCTV controls use three columns on narrow screens and six on wide screens.

Browser checks on Apple M4 Pro (Mac16,8), Codex in-app browser, Standard graphics, 844×390 and 390×844: lobby orbit, walk-through doorway, TV selection with continuing timer, Answer the door, human admission, all 12 seated resident fixtures, rear door view, six-camera portrait layout, anomaly trust deduction and recovery. Full-lounge scene: 399 geometries / 29 textures; returning to lobby: 113 / 19. Office view with full resident roster sampled around 30 FPS (~33 ms/frame); surveillance samples around 20 FPS while using demand rendering. These samples describe this desktop browser only, not physical iPhone performance or guaranteed FPS.

Final validation: 70 game tests, TypeScript/production build and targeted lint pass. Browser logs showed no errors during the final rehearsal. Portrait and landscape scare captures confirmed the close-up, followed by recovery with one trust life deducted. Gentle/reduced-motion pose behaviour is covered by tests. Physical iPhone multi-touch, perceived scare/audio intensity and frame times remain device-validation items.

## October 2026 — tablet controls and new activities

The tablet joystick is now 176×176px with a 64px thumb in both orientations (minimum viewport edge 600px). Phone sizes stay 112/128px. Movement radius follows the rendered control. Shop/customisation keep a labelled Back to lobby button and purchase actions outside the catalogue scroll; short landscape screens condense the heading so the items remain visible.

Guided practice is available at the lobby tablet beside START. The CCTV arcade supports tap/hold, mouse and Space, with a larger portrait playfield and identical physics. A knock suspends it, displays the actual door countdown and retains the run. The console focuses its dialog container so a lingering jump key cannot activate Close. Dialog keyboard navigation stays trapped within its controls. All gesture owners are cleared on view/menu changes.

Validation on October 16, 2026:
- 77 game tests passed, including ownership, legacy saves, tutorial reward isolation, arcade collision/traversability, interruption and proportional tablet movement. Targeted lint and production build passed.
- In-app browser: iPad 820×1180 / 1180×820 controls measured 176×176px / 64px thumb; phone 390×844 and 844×390 shop layouts checked. Arcade portrait and landscape checked; portrait was enlarged after the first visual pass.
- Browser flow checked: lobby tablet, movement/look tutorial steps, questions and rear-door camera; production shop purchase/equip/refresh; console selection, arcade failure/re-entry, live knock interruption and Space-key focus protection. Complete tutorial progression including TV and retry behavior additionally verified through store tests.
- Apple M4 Pro, Mac16,8, 24GB; Standard graphics. Lobby samples ranged 117–120 frames/sec (approximately 8.3–8.5ms per frame) in this local browser. Three shop/Sidekicks open-close cycles returned to 153 geometries and 30 textures in the main renderer. These are local samples, not a device-wide FPS guarantee or a full GPU memory profile. No browser errors during the checked flows; existing Three.Clock deprecation warning remains.
- Physical iPhone/iPad touch feel, audio perception and sustained thermal performance still need Fenn’s device playtest. Changes remain local; no GitHub push or publication in this phase.

### Dawn judgement and six-shot controls

- Portrait mistake HUD uses a compact two-line label, with a separate decision countdown.
- Fire is a dedicated touch button above the existing interaction control. Look swipes retain independent ownership and cannot fire; no firing from CCTV/TV/arcade or menus.
- Armed result feedback sits above the aim area rather than covering Fire. Open-door aiming includes a Close door action and retains the original decision deadline.
- Browser sizes checked: 390×844, 844×390, 820×1180. Physical simultaneous move/look/fire on iOS remains a device acceptance check.
