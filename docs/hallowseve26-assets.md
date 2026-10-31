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

## Toybox/audio update — 30 October 2026

Shipped music: **Wintery Loop** by Emma_MA (day), **Creepy Ambient Loop v2** by epb9000 (night), both CC0 on their OpenGameArt source pages. UI SFX Set and one wooden impact by Kenney are CC0. Public credits, exact source URLs, pinned GitHub revisions, byte sizes and SHA-256 hashes are in `public/hallowseve26/audio/credits.txt` and `manifest.json`.

The official Kenney ZIP links redirected away from the downloads. Selected UI WAVs were retrieved from Calinou/kenney-ui-audio at `8c3d81b9159d058c444f89d12d518276b0b09345`; the pack's LICENSE.txt explicitly permits personal/commercial use under CC0. The impact came from gdquest-demos/godot-open-rpg at `d59f2f71bc046ac53239a4e590861269e7100a36`, with its CREDITS.md identifying Kenney Impact Sounds and CC0. Only six audio files and licence text were imported. No repository scripts, plugins, package manifests, archives or binaries were executed. This is a bounded asset/provenance review, not a security certification of those entire repositories.

Music was decoded and checked for finite samples, peak/RMS and duration (44.31s day, 58.91s night). The original day seam had a 0.10 sample jump; both tracks received 25ms endpoint fades before 128kbps AAC conversion. The wooden impact was decoded to PCM WAV for broad browser support. Total shipped audio is about 1.75 MB. No human listening audit has been claimed; the settings menu offers previews for subjective soundtrack review.

Original resource/action icons are local SVG JSX. All building and troop portraits are generated from the same Three.js primitive definitions that the world renders, using `scripts/render-hallowseve-previews.mjs`. Portrait generation runs offline and adds no per-card WebGL contexts. No downloaded art, font or executable dependency was introduced for this update. The X post supplied in the request could not be read reliably; no assets or claims were inferred from it.

## Living Northlands v3 — 31 October 2026

Nine original local WAV effects/ambience were authored using standard-library Python synthesis: river, chop, mine, saw, craft, step, clash, cannon and magic. The deterministic source is `scripts/render-hallowseve-foley.py`. No new downloaded asset, repository script, runtime package or external network service was introduced for v3. These are original project-owned assets, not recordings falsely attributed to Kenney. Music and the previous UI/impact sounds retain their documented CC0 licences. The manifest identifies each asset's licence category and checksum. No human listening audit is claimed.

Character geometry and rig pivots are original code in `character-model.ts`, shared between live instances and generated portraits. Portrait generation remains offline. Construction models, dust/sparks and health/range indicators are local code-authored geometry. Browser checks and automated tests do not amount to an independent security audit or mobile hardware certification.
