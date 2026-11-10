# Photography: drop, prepare, review, publish

## Quick start

1. Put edited JPEG, PNG or TIFF exports in `photography-originals/` at the project
   root. Subfolders are supported. Keep your own backed-up masters elsewhere.
2. Run `npm run photos:prepare` (or ask Codex to prepare the photographs).
3. Open `.photography-work/contact-sheet.html` to review the web versions. Click
   an image to inspect its largest WebP version. The corresponding AVIF files
   are beside it in `.photography-work/images/` for comparison.
4. Edit `data/photography-catalog.json`: write accurate alt text, review the title,
   add an optional description/location, and set `published: true` when ready.
5. Run the command again. Review `.photography-work/report.json`, preview the
   site, then commit the catalogue, generated manifest and generated public images.
   Push through the usual GitHub workflow to deploy.

The site never reads your originals or draft catalogue directly. New discoveries
are drafts. Only published entries and processed versions reach the public site.
Both `photography-originals/` and `.photography-work/` are excluded from Git and
Vercel uploads. Do not put masters in `public/`.

## Catalogue example

```json
{
  "id": "coast-at-dawn",
  "source": "landscapes/coast-at-dawn.jpg",
  "title": "Coast at dawn",
  "description": "The first light over the water.",
  "alt": "Pink morning light on a rocky coastline beneath low cloud",
  "location": "Northumberland",
  "order": 1,
  "published": true,
  "replacesId": "frame-01",
  "quality": { "avif": 65, "webp": 85 }
}
```

`source` is relative to the private originals folder. Keep `id` unchanged when
replacing an export. If you rename/move a file, update its `source` before running
preparation. All manually edited fields survive future runs.

`replacesId` is optional. Use a placeholder ID such as `frame-01` to replace that
Unsplash photo while preserving its gallery anchor and featured selection. Set
`order` to its existing position if you want to retain the layout order. Original
photos without a replacement ID are added to the collection using their own ID.
Only replace placeholders intentionally; other photographs remain unchanged.

Alt text describes what is visible; a poetic title alone is not an accessible
image description. Drafts may have empty alt text; publishing requires descriptive
text. No scene descriptions, locations or authorship are inferred from filenames.

## Six featured images and gallery order

The catalogue's top-level `featuredIds` array must contain exactly six unique IDs.
Use the display ID: `replacesId` when replacing a placeholder, otherwise `id`.
Every selection must exist in the resulting published collection.

The numeric `order` field controls gallery order. Equal values use the ID as a
stable tie-breaker. The first image is the cinematic hero. Choose a landscape for
that slot; the hero is cropped, but the viewer shows the complete photograph.

Initially `includePlaceholders` is true. Set it to false when you have at least
six published originals and update `featuredIds` to select six of them. Placeholder
notices and source credits disappear automatically when no placeholders remain.
No manual component edits are needed. The old third-party sources and credits
remain documented in `data/photography-placeholders.json`.

## Quality and file size

Preparation creates AVIF and WebP candidates at widths 480, 960, 1600, 2400 and
3840, limited to the native dimensions and a 3840-pixel longest edge. Small files
are never enlarged. Portrait outputs therefore have narrower maximum widths.
Orientation is corrected, colour converted to sRGB with its ICC profile, and
camera/GPS metadata removed. Exposure, saturation, sharpness and crop are not
creatively adjusted. Review your exports first in your photo editor.

Defaults are AVIF 65 and WebP 85. Per-photo `quality` overrides accept integers
from 1 to 100. Use higher values for visible banding, fine foliage or grain. Quality
numbers are encoder-specific, not percentage accuracy. Review at natural viewing
sizes and 100% detail on a phone and a large screen. Display calibration can still
change the perceived colour; the pipeline cannot reconstruct detail absent from
an original export. RAW, HEIC and multi-page images need exporting first.

The browser chooses an appropriately sized static file; it does not run these
files through Next.js optimisation a second time. AVIF is preferred with WebP as
the fallback. Other images on the website retain existing Next.js handling.
The gallery initially shows 24 photos with accessible batches of 24; its viewer
can navigate the full published collection. Larger viewer files load on demand.

A trial with three detailed landscape, dunes and city exports produced 15.74 MiB
across all variants: about 525 MiB for 100 similarly detailed photographs. This is
a planning estimate, not your account's remaining hosting allowance. Measure your
own exports using the preparation report before importing the full collection.
Retained deployments and previous image versions also consume storage.

## Safety, caching and reports

- Originals are read only and never deleted or rewritten.
- Content hashes include encoding settings. Unchanged images skip re-encoding;
  changed images get new URLs, preventing stale image caches.
- A failed batch leaves the previous public manifest intact. Fix the errors in
  `.photography-work/report.json` and rerun. Source files must be fully downloaded
  from iCloud or other on-demand storage before processing.
- Previous public variants are retained for safety. Unpublishing removes a photo
  from the gallery, but does not erase already published URLs or Git history.
  Ask for deliberate cleanup if you need those versions removed.
- `.photography-work/report.json` lists new, processed, unchanged and draft entries,
  errors, processed byte totals and all retained public photo storage.
- Preparation uses a local lock. If the process is forcibly interrupted, confirm
  it is no longer running before deleting `.photography-work/prepare.lock`.
- Cloud builds consume committed outputs; they do not require private originals,
  invoke the processor or regenerate pictures.

Builds automatically check the published manifest and image files with `npm run photos:check`, so missing generated files fail before deployment.

Run `npm run test:photography` for the isolated processor regression tests.

## Pocket Racers VR

Set the official Meta listing URL in `metaStoreUrl` in `data/games.ts` when ready.

## Camera settings in captions

Preparation reads focal length in millimetres, aperture (f-stop), shutter speed and ISO from the original's
EXIF data and adds only these four values to the published manifest. Labels show
these settings below the title on homepage prints, in the gallery and in the
viewer—for example `35 mm · f/2.8 · 1/125 s · ISO 800`.

Settings missing from an export are simply omitted; nothing is guessed. Export
with exposure metadata retained if you want these labels. Run preparation again
to update captions for existing photos; unchanged web images are not re-encoded.
GPS, camera serial numbers, owner details and other EXIF fields are not published.
The web image files themselves still contain no EXIF metadata.

Focal length is the actual EXIF lens focal length at capture, not a calculated
35 mm equivalent. Missing focal lengths are omitted.
