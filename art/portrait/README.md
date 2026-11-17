# Clay portrait

Generated privately in Tripo from the existing Imagegen clay portrait, 17 November 2026 (30 credits). Tripo asset: 3d900287-f75a-4737-ac1b-dfb4dfc4fde1. Original photography is unchanged.

- `mark-clay-source.glb`: original Tripo export.
- `mark-clay-rigged.blend`: editable Blender 5.1 scene with weighted neck, stationary shoulders and separate eyes.
- `../../public/portfolio/avatars/mark-clay.glb`: optimized web export (approximately 1.4MB).

Rebuild from repository root using Blender in a separate background process:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender-portrait.py
```

The script welds/subdivides the mesh, cuts eye openings, decimates, adds independently rotating eyes, weights the head and compresses textures. It saves the editable scene and exports the GLB. The rig uses nodes named `Head`, `EyeLeft`, and `EyeRight`, glTF +Y up/+Z forward, under 40,000 triangles, under 3MB, textures up to 2K.

Preview renders are written to /tmp. The rig is retained as an editable study. The homepage uses the original clay illustration on a shallow relief surface to preserve its painted expression and lighting.
