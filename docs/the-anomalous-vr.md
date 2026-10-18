# The Anomalous — Quest 3 VR

## Status

Implemented locally on 18 October 2026. A physical Quest 3 playtest remains required before treating VR as release-ready. Desktop emulator results establish integration behaviour, not headset performance or comfort. Publication to the existing HTTPS site was requested on 18 October 2026 for headset testing.

## Playing

Open `/playground/the-anomalous` in Quest Browser on a trusted HTTPS origin, then select **Enter VR · Quest controllers**. Use both Touch controllers. The VR option is shown only in Meta Quest Browser, after secure-context and immersive WebXR capability checks succeed. Desktop, phone and tablet browsers retain the ordinary game without VR controls. The headset keeps its own browser save; there is no cross-device synchronisation.

- Left stick: smooth walking, relative to the direction you are looking.
- Right stick: smooth turning around your head position.
- Trigger: point at an object or spatial button and select. Hold on a screen’s top bar to drag it. An on-screen ray endpoint marks the selection.
- Walking near objects or pointing at them never opens a menu. Aim at the door handle and press trigger to inspect; aim at the CCTV monitor to open its live view directly. Lobby stations also require a deliberate trigger press.
- B/Y: pause/menu; clears held movement and arcade input. Resume after a headset interruption.
- Gun: point at the shelf and press either trigger to collect (grip also works); dominant trigger fires. Aim at the shelf and interact to return it. Ammunition survives returning/recollecting. Releasing grip does not discard it.
- Arcade: dominant trigger or A/X jumps. Back to room is available through the spatial menu.
- VR settings: optional teleport, snap turns, speed adjustments, handedness, seated height calibration and a movement vignette. Smooth walking (1.5 m/s) and smooth turning (60 degrees/s) are the defaults.
- Teleport mode: push the left stick while pointing at reachable floor, then left trigger to confirm. Invalid paths across partitions/furniture have no destination marker.

Real head motion is never clamped or shaken. Moving physically into walls fades the view; move your head back to clear it. Scares are world-space objects anchored when the scare begins, allowing you to look away.

## Local headset connection

The published HTTPS game is the simplest untethered test. Subsequent local revisions require a separately requested push.

Alternatively, Meta documents USB port reversal for local browser testing. With Quest developer mode enabled, USB debugging authorised by the headset owner, and Android Platform Tools installed:

```sh
adb reverse tcp:3000 tcp:3000
```

Keep the local development server running, then open `http://localhost:3000/playground/the-anomalous` in Quest Browser. This is the headset's trusted loopback origin forwarded to the Mac. An ordinary HTTP LAN IP is not equivalent and does not provide the secure context WebXR needs.

Reference: https://developers.meta.com/vr/documentation/web/browser-remote-debugging/

No device settings, debugging permissions or certificate trust were changed automatically. Android Platform Tools were not present during this implementation.

## Architecture

- `components/deader/vr-entry.tsx` detects support and lazy-loads the XR runtime; ordinary browsers do not load the VR package. It leaves normal navigation and touch/keyboard rendering intact.
- `components/deader/vr/` owns the XR origin, physical controller poses, controller-ray actions, gun, in-world menus, secondary camera screen, wrist display and local emulator fixtures. Desktop lobby/room controllers unmount during an immersive session.
- `lib/deader/vr.ts` contains pure validated preferences, radial stick dead zones, frame-gap limits, head-pivot turns, floor validity and swept teleport checks. `vr-state.ts` is transient presentation state; no active XR session is persisted.
- Optional `settings.vr` fields use the existing version-3 save. Missing or malformed values receive safe defaults. Versions 1–3 continue through the existing reader without resetting coins, cosmetics or records.
- Spatial menus are explicit headset screens from `lib/deader/vr-menu.ts`, with at most four main choices and separate navigation. They call shared store actions without inspecting or clicking the ordinary DOM. CCTV decisions use a guarded VR-only bridge to the existing decision/reward path. Confirmation IDs expire with the encounter. Questions from CCTV are allowed only during an active XR session.
- Hold either trigger on the grab bar to move a screen; release to place it. Panels remain upright, bounded to 0.6–2 metres from the head, and have Recenter. Opening placement samples the screen width against room/furniture bounds; tight spaces fall back to depth-independent rendering. Feed and preview follow the panel. UI actions take priority over shooting.
- Controller rays test registered screen targets and a cached set of interaction objects/wall occluders, rather than recursively querying all decorations. Menu/watch textures upload only when their content or hover changes. Mirror/feed renders are staggered to avoid the same frame. Detailed bullet checks run only on shots.
- Rotating shop previews are actual 3D character/pet objects. The second shop WebGL canvas is disabled during VR. The existing arcade canvas supplies a texture to the VR display; it keeps its original gameplay and input reset rules.
- CCTV/peephole/Mimic feeds render to one 512×288 target at 10 Hz. Headset rendering remains continuous. Mirror reflection skips those secondary cameras and is capped at 10 Hz in VR. The ordinary DOM lounge inset renderer is disabled in VR.
- The tracked gun and hands naturally render into the mirror. The old camera-relative gun and fixed reflected gun are suppressed during VR.
- Quest defaults request 72 Hz when supported, 0.8 framebuffer scaling, foveation and no dynamic shadows. These are starting settings for real-device tuning, not an FPS guarantee.

## Verification recorded

- 109 automated gameplay/VR tests pass, including old save defaults and preference persistence, malformed values, diagonal/dead-zone behaviour, frame gaps, head-pivot turning, and teleport partitions/furniture.
- Targeted ESLint, TypeScript and production build pass.
- Local HTTP checks: homepage, Playground, The Anomalous, Soccer98 and Rally return 200. The legacy Dead Deadly Deader route returns its existing permanent redirect (308).
- Meta IWER emulator: entered VR; spatial shop preview and controller-ray exit; visitor rejection and confirmation through the controller ray; live CCTV on a separate screen; repeated lobby/room transitions; dawn/Game Over flow. No new console errors in the final clean run. Earlier hot reloads produced IWER errors while the WebGL context was being replaced; runtime cleanup now ends an active XR session on unmount. Restart the emulator after editing its runtime.
- Desktop test host: Apple M4 Pro, 24 GiB RAM, Codex in-app browser with IWER, development build. Two room/CCTV samples (300 frames each): mean 8.34/8.35 ms, p95 17.6/17.7 ms; 295/299 geometries and 33/33 textures. Visitor-dependent geometry varies; these samples are not proof of long-run leak freedom or Quest frame rate. An earlier sample during compilation averaged 26.2 ms.

## Developer fixtures

Development only: append `?vrtest=1` to the game URL. This installs IWER for that page, exposes a rehearsal selector and offers explicit room/shop/CCTV/locomotion controls. It never grants real rehearsal rewards. The **Point and trigger** action aims a simulated controller at a currently rendered VR menu label and presses its trigger; it exercises the actual ray and input path.

Use the existing armed, mirror, visitor, paired arrival, Mimic, bundle and judgement fixtures through the selector. `data-vr-stats` on the main canvas records a rolling 300-frame mean/p95, geometry/texture counts and draw calls. Physical headset readings should be captured through remote debugging, not inferred from IWER.

## Required Quest checkpoints

1. **Foundation:** room scale/floor, standing and seated height, smooth turning and walking, collision fades, teleport alternative, readable panels, pause/return, controller disconnect/reconnect and repeated entry/exit.
2. **Playable night:** full five-minute night; all door questions and confirmations, deadline visibility, each CCTV feed and peephole, TV subtitles, arcade jump/restart/exit, six-shot gun pickup/fire/return, close-wall aiming, reflected hands/gun, and positional audio. Check both handedness settings.
3. **Full flow:** lobby tutorial, every shop category and bundle, purchase/equip/refresh, Mimic countdown and time to walk to the lounge, both dawn outcomes, scare depth/intensity, and repeated scene transitions. Measure headset frame-time stability and memory over at least three nights.

Do not promote the VR build as Quest-validated until these checks are complete. Hand tracking, mixed reality, multiplayer, cross-device cloud saves and a native store package are deferred.

## Comfort and interaction revision — 18 October 2026

Locally implemented after the first Quest playtest; not pushed by this revision. Smooth turning remains the saved/default setting. Trigger is now the primary pickup, object, screen and firing control; grip remains an optional shortcut. The GLB faces +Z internally; a VR-only 180-degree correction and grip offset align it to the explicit -Z muzzle, without changing the shelf or desktop model.

Validation: 109 tests, including explicit menu pages, bundle affordability/separate equip, stale confirmation expiry, guarded CCTV decisions, panel placement and actual GLB axis alignment. IWER controller-ray shop navigation, trigger-held dragging (0.35 m translation), CCTV rejection and zero-mistake outcome verified. Room sample on the same M4 Pro/24 GiB host: 300 frames, mean 8.43 ms, p95 18.4 ms, 296 geometries, 33 textures, 407 draw calls. Shop sample: mean 8.34 ms, p95 9.2 ms, 189 geometries, 32 textures, 278 calls. Immediately after repeated lobby/room/CCTV transitions: mean 10.11 ms, p95 23.2 ms, 296 geometries, 32 textures, 423 calls; this includes transition work. These are different scenes and not a controlled Quest before/after benchmark; no headset frame-rate improvement is claimed.

New development fixture: **Drag screen** holds the actual simulated controller trigger and moves its pose. `data-vr-screen` exposes displayed title/buttons, position and drag state for test observation.

Physical acceptance still required: both hands’ gun angle/grip/muzzle and mirror; firing beside walls; door/object targeting; screen dragging near walls while seated; smooth-turn comfort with recording off/on; three-night resource soak and dropped-frame profiling on Quest 3.

## Explicit activation revision — 18 October 2026

Removed proximity-driven panels and hover writes to game state. Menus open only through explicit controller activation, remain at their placed position until dragged/recentered, and no longer switch size or reset their canvas on hover. The existing requested Mimic alert remains a passive lounge inset, without opening the interaction menu. Automatic end-of-night and interruption screens remain.

Door targeting is limited to its handle in VR. Gun pickup/return call the existing guarded actions directly and preserve ammunition. CCTV opens its live view without an intermediate console chooser; when nobody is waiting, it offers only camera selection and the arcade. The visitor view keeps four main choices. Stable button metadata prevents regular game updates from temporarily clearing trigger actions between menu refreshes.

Validation: 114 automated tests pass, including 1,000 hover-state changes without opening a panel, explicit activation, handle targeting, gun pickup/return through the real store guards, and simplified empty CCTV screens. Targeted ESLint, TypeScript and production build pass. IWER confirmed handle hover leaves menus hidden, trigger opens the visitor screen, Close stays closed, and gun pickup/return changes the shelf target without showing a menu. No console errors in the final browser run. These checks do not replace physical Quest testing. Changes remain local pending a separate push request.

Development controls **Aim at object** and **Press trigger** exercise world targeting independently; **Point and trigger** selects a displayed menu button. Canvas diagnostics expose visibility and the last controller action for regressions.
