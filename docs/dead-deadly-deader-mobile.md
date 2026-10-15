# Phase 10 — mobile and tablet support

Touch gameplay is implemented for local review. Physical iPhone/iPad Safari sign-off and Android hardware testing are outstanding. This is not verified on every mobile device.

## Controls
Landscape gameplay uses a left joystick, right-side swipe-to-look in the room, and a labelled interaction button. The lobby retains its follow camera. Movement has a 15% dead zone and proportional speed, with existing collisions and diagonal speed cap. Movement/look pointers own independent gestures; a third finger can tap interaction. Release, cancellation and lost capture clear input. Swipes never activate objects.

Settings offer Auto, Touch, or Keyboard and mouse, plus separate touch sensitivity. Auto follows input type. Visual quality stays Standard by default; saved choices are preserved, with Low available. The cosmetic preview respects the same resolution cap.

Portrait freezes gameplay; menus remain usable. Returning to landscape or from another app requires Resume. Active clocks, decisions and survival sequences honour suspension. No background catch-up occurs. Fullscreen and orientation-lock APIs are not required.

## Architecture and saves
`lib/deader/input.ts` supplies transient axes, keyboard state, look deltas, pointer ownership and reset operations to both controllers. TouchControls owns pointer capture and lifecycle events. Store state adds transient touchActive and suspension (portrait/interrupted/null), separate from menus/focus and never saved.

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
5. Both landscape directions, portrait menus, notches/home indicator and browser bars. Essential controls must remain reachable.
6. At least 20 minutes and ten room/lobby transitions. Record frame-time samples, resource counts and slowdown; target sustained 30 FPS or better. Try Low if Standard falls short without silently changing defaults.
7. WebGL/context loss recovery: cosmetics/progression survive reload; transient runs restart.

Desktop simulations are not mobile FPS evidence. Android Chrome uses the same controls but remains unverified on hardware. Native apps, gamepads, multiplayer, offline installation and portrait gameplay are deferred. No public deployment in this phase.
