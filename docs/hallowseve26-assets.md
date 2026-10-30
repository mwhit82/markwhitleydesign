# HallowsEve26 v2 — asset provenance and dependency screening

Reviewed 2026-10-30. This is a scoped integration review, not a security
certification of third-party repositories.

## Assets shipped

All new models, terrain, colours, effects and UI are authored in this repository.
Geometry is generated locally using the existing Three.js renderer. Audio is the
existing locally synthesised ChristmasAudio. No external models, textures,
executables, authoring tools, npm packages, CDN runtimes or user uploads were
introduced. No external attribution is required for these original additions.
Existing application dependencies retain their original licences and notices.

## Repositories associated with the supplied post

The X page could not be read directly. The ten-repository list was recovered from
a secondary page referencing the exact status URL, then repository identities
were verified against official GitHub repositories. Treat this association as
indirect; no third-party article was accepted as a security verdict.

| Repository | Decision for v2 | Review boundary |
| --- | --- | --- |
| https://github.com/zeux/meshoptimizer | Not installed; future optimisation candidate | Reviewed tree `f0a684f11ead064e176775c9b796f82a55910e92`, MIT licence, `js/package.json`, and decoder source indicators. Manifest version 1.3.0 declares no dependencies or install hooks. Decoder instantiates embedded WebAssembly. This does not verify the published npm tarball or prove decoder safety. |
| https://github.com/RodZill4/material-maker | Not installed; potential offline texture tool | Reviewed tree `7d6daae3c74c09720afe4138ce09699ab3591ce1`, MIT licence, bundled add-on/licence paths and sharing HTTP code. Includes networking and third-party add-ons, so it is executable authoring software, not passive art. |
| https://github.com/effekseer/Effekseer | Deferred | Reviewed tree `b5700082b49bc5f919610880dafddc90211a9a4e` and top-level MIT licence. Separate tool/runtime/third-party notices exist. No runtime or editor audit performed. |
| https://github.com/jrouwe/JoltPhysics | Excluded | Official repository metadata only; native physics unnecessary for this game. |
| https://github.com/TokisanGames/Terrain3D | Excluded | Official metadata/description: Godot terrain integration, not this renderer. |
| https://github.com/Zylann/godot_voxel | Excluded | Official metadata: Godot voxel module. No code executed or imported. |
| https://github.com/recastnavigation/recastnavigation | Excluded | Official metadata: navigation middleware; v2 uses its existing grid approach. |
| https://github.com/guillaumeblanc/ozz-animation | Excluded | Official metadata: C++ animation library. No code or assets imported. |
| https://github.com/ConfettiFX/The-Forge | Excluded | Official metadata: a rendering framework; no engine migration needed. |
| https://github.com/Auburn/FastNoise2 | Excluded | Official metadata: native noise library; no dependency needed for authored terrain. |

Future adoption requires an exact release/tarball review, dependency and advisory
checks, licence/asset-rights checks, integrity recording and inspection of
installation/network behaviour. Exported models must be inspected for external
references and resource budgets before local serving. Do not infer safety from
stars, an MIT licence or absence of published advisories.

## Existing dependency audit

`npm audit --omit=dev --json` on 2026-10-30 reported four high-severity affected
package entries, all tracing to one existing Zod advisory through
`@vercel/functions → @vercel/oidc → @vercel/cli-config → zod`:
https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

The advisory concerns memory exhaustion while validating oversized collections.
This change adds no Zod use or server input endpoints. Exploitability of the
existing Vercel dependency chain was not established by this review. npm's
suggested remediation changes the Vercel package version; it was not applied
blindly to unrelated multiplayer/server functionality. This remains an existing
site-level dependency follow-up, not a clean security bill for the whole site.
