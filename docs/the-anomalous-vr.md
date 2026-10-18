# The Anomalous — Quest 3 VR

## Status

Implemented locally on 18 October 2026. A physical Quest 3 playtest remains required before treating VR as release-ready. Desktop emulator results establish integration behaviour, not headset performance or comfort. Publication to the existing HTTPS site was requested on 18 October 2026 for headset testing.

## Playing

Open `/playground/the-anomalous` in Quest Browser on a trusted HTTPS origin, then select **Enter VR · Quest controllers**. Use both Touch controllers. The VR option is shown only in Meta Quest Browser, after secure-context and immersive WebXR capability checks succeed. Desktop, phone and tablet browsers retain the ordinary game without VR controls. The headset keeps its own browser save; there is no cross-device synchronisation.

- Left stick: smooth walking, relative to the direction you are looking.
- Right stick: smooth turning around your head position.
- Trigger: point at a spatial menu and select. An on-screen ray endpoint marks the selection.
- B/Y: pause/menu; clears held movement and arcade input. Resume after a headset interruption.
- Gun: grip near the shelf to collect; dominant trigger fires. Aim at the shelf and interact to return it. Ammunition survives returning/recollecting. Releasing grip does not discard it.
- Arcade: dominant trigger or A/X jumps. Back to room is available through the spatial menu.
- VR settings: optional teleport, snap turns, speed adjustments, handedness, seated height calibration and a movement vignette. Smooth walking (1.5 m/s) and smooth turning (60 degrees/s) are the defaults.
- Teleport mode: push the left stick while pointing at reachable floor, then left trigger to confirm. Invalid paths across partitions/furniture have no destination marker.

Real head motion is never clamped or shaken. Moving physically into walls fades the view; move your head back to clear it. Scares are world-space objects anchored when the scare begins, allowing you to look away.

## Local headset connection

A published HTTPS preview is the simplest untethered test. Production publishing remains separate.

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
- Spatial menus adapt the mounted semantic menu controls into paginated canvas textures and controller targets. Their actions click the original current controls, retaining the existing confirmation, affordability, ownership and reward protection. Door decisions and exit actions remain pinned. Dialogue wraps across pages instead of being truncated. Keep accessible names and dialog semantics intact when editing ordinary menus.
- Rotating shop previews are actual 3D character/pet objects. The second shop WebGL canvas is disabled during VR. The existing arcade canvas supplies a texture to the VR display; it keeps its original gameplay and input reset rules.
- CCTV/peephole/Mimic feeds render to one 512×288 target at 10 Hz. Headset rendering remains continuous. Mirror reflection skips those secondary cameras and is capped at 10 Hz in VR. The ordinary DOM lounge inset renderer is disabled in VR.
- The tracked gun and hands naturally render into the mirror. The old camera-relative gun and fixed reflected gun are suppressed during VR.
- Quest defaults request 72 Hz when supported, 0.8 framebuffer scaling, foveation and no dynamic shadows. These are starting settings for real-device tuning, not an FPS guarantee.

## Verification recorded

- 103 automated gameplay/VR tests pass, including old save defaults and preference persistence, malformed values, diagonal/dead-zone behaviour, frame gaps, head-pivot turning, and teleport partitions/furniture.
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
