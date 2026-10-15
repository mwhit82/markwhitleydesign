# Dead Deadly Deader — asset guide

## References
Fenn's approved room image: `A0F05B3D-BBE9-4979-8847-5A2AD93C3114_4_5005_c.jpeg`; original START sketch: `4EB398EC-7EB9-4E44-9A20-ED82B862B04E_4_5005_c.jpeg` (user-supplied Photos-library references). Preserve warm dark office proportions, chained panel door, brass knob, ladder/vent, dirty mirror, CCTV desk, cosmetics poster and Donut. Cone figures in room reference represent multiplayer, not solo props.

## Existing procedural assets
`components/deader/character.tsx`: rounded lathed cone, simple black face/limbs, idle/walk, optional backpack/selfie stick. Colour and animation props are the replacement interface. `character-wear.ts`: deterministic neutral 256px grime/scratch maps, multiplied by cosmetic colour, explicitly disposed.

`room-materials.ts`: seeded 512px timber/floor/plaster/metal colour and relief maps, reusable material instances, brass, glass and tarnished mirror. `room-atmosphere.tsx`: one spotlight, fills, dust, low-cost beam; 128px static cubemap and explicitly owned/disposed prefilter target. `lobby-atmosphere.tsx`: live character shadows. `use-light-flicker.ts`: occasional single voltage dips; reduced-motion aware.

`environment.tsx`: shared boxes and local canvas signage, optional ageing. `scenes/room.tsx`: room props and Donut. No external image/font/audio downloads required for game assets. UI uses local CSS/system fonts.

## Blender / GLB conventions
Metres, Y-up, feet at origin, character face along +Z, cone approximately 1.5m tall. Apply transforms, export glTF 2.0/GLB, name body-colour material and idle/walk clips. Keep simple collision proxies separate from render meshes. Door pivot at hinge; leaf, knob and chain separately addressable. Export sensible UVs for worn plastic and reusable materials. Avoid oversized textures, unnecessary lights/cameras and dense subdivisions. Preview against all five colour cosmetics and existing warm lighting before replacement.

## Phase 2 additions
Door animation uses existing procedural panels/hardware. CCTV annex geometry is surveillance-only, shared in the scene, with one selected camera. News uses local text/graphics and supports optional future media in its data contract. Interaction audio should use a gesture-unlocked, disposable Web Audio service with gentle procedural knocks/creaks/static, no external services or licences. Later authored sounds must include source/licence metadata and obey volume/reduced-intensity settings.

## Visitor assets (Phase 3)
`lib/deader/visitors.ts` defines six profiles with appearance, movement, dialogue and evidence. `components/deader/visitors.tsx` reuses the worn Cone model, draws one active visitor, interpolates its position along the shared staircase/landing path, and handles footsteps. `character.tsx` adds optional third-eye and wide-mouth variants; ordinary player/shop cones retain their original features. No imported models, external textures or AI services. Knocks trigger once at arrival; footstep sounds reuse the local audio service. The peephole aims at face height and the visitor waits far enough from its camera for clues to remain visible. The seeded stop-start path and rigid sway provide CCTV tells; reduced-motion disables exaggerated sway while other clues remain available.

## Phase 4 presentation
No external models, textures or media added. Existing Cone performs the Anomaly lunge/recovery; the existing Donut mesh changes movement and performs the final stylised leap. Both disable their lunges for gentle/reduced-motion play. The audio service adds bounded synthesised scare, rumble and gulp cues with master volume, mute and reduced scare gain. Survival overlays use CSS, without post-processing or extra render targets. `lib/deader/survival.ts` is the pure sequence/settings authority; `survival-ui.tsx` supplies captions, settings and results. A future GLB must preserve the shared character interface and Donut parent-space transforms.

## Phase 6 content
Story variants and Infinite reuse the existing room and single visitor mesh. Ash, Nell and Jules use catalogue colour/dialogue/movement definitions; hard Robin/Nell dialogue variants retain explicit evidence. No downloaded assets or new dependencies were introduced. The ending uses a text news overlay, existing room camera/Donut pose, one synthesised vent knock and a CSS fade. Normal rendering returns after the sequence. CCTV keeps its selected-feed cap, with small difficulty-specific static opacity changes.

## Phase 7 accessory assets
Night Watch Cap and Dented Tin Hat use two low-segment meshes each at Cone-local y=1.38. Old Shift Pack uses the existing back-mounted shape at [0,0.65,-0.3] with reused wear maps. Round Glasses use two 16-segment torus rims and a bridge at [0,0.99,0.27], pitched to the cone face. No new raster images, external assets or render targets. All gear attaches to the animated body group, so it follows idle/walk motion. Prices/IDs/categories live in cosmetics.ts; render selections use Cone.outfit. Future GLBs should preserve those anchors and avoid new lights or duplicate environment maps.

## Phase 8 sound and presentation
RoomAudio synthesises reusable oscillator cues through a low-pass filter and stereo panner, plus a two-second local noise buffer for ventilation and a 54 Hz hum. At most 12 one-shot sources and two ambient sources; cleanup disconnects nodes and closes the game-owned context. No external recordings/licences or speech services. Replace cues behind the same play/silence/dispose interface for future recorded assets.

Cone supports AnimationState and animationKey using local pose time and the shared pure characterPose function. Talk/knock are finite gestures; GLB animation clips can map to the same states. Visitors select rush/lean/stutter via scareVariant while survival remains the sole timing/penalty authority. Mirror uses existing metal relief as a small bump; the rare shadow stripe is one transparent plane. Broadcast cards/scanlines/grain are CSS; no texture downloads or expensive post-processing.
