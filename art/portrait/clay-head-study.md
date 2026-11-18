# Reference-fitted Blender head

The isolated review route is `/preview/clay-head`. Compare the reference to the skinned Blender bust using Live, Neutral, Left and Right. The original homepage renderer is independent of this preview.

Open `clay-head-study.blend` to edit the fitted facial mesh, shaped eyelids and two textured eyeballs. The file contains the embedded front reference, camera and baked atlas. For reproducible changes, edit the landmark pairs, socket dimensions and projection settings in `scripts/blender-clay-study.py` and run from the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/blender-clay-study.py
```

The starting point is the earlier rigged Tripo study. The script fits the frontal landmarks, reshapes the lid openings, gives each eye its own image derived from the reference, and bakes the visible reference colours into the original UV layout. The side and back use the Tripo colours. The camera is orthographic, centred at model height 1, with a square span of 2.2. The renderer uses the baked studio lighting. Front artwork gives the most reliable likeness within the preview's 10° yaw and 6° pitch.
