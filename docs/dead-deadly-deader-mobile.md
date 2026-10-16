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
