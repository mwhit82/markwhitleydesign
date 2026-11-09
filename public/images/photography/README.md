# Photography content

The single source of truth is `data/photography.ts`. Both the homepage and
`/photography` use it. The first entry by `order` becomes the gallery hero.

## Replace a placeholder

1. Put your photograph here, e.g. `public/images/photography/coast.webp`.
2. In its existing entry, set `src: "/images/photography/coast.webp"`.
3. Set `width` and `height` to the actual pixel dimensions. These reserve space
   and determine the natural aspect ratio; no separate orientation field is needed.
4. Write accurate `alt` text describing the visible scene. Set an optional `title`
   and `location`; omit them if unknown. Titles here are editorial labels, not
   claims about the photographer's original titles.
5. Set `placeholder: false` and remove `credit` and `sourceUrl` for your own work.
   Keep `id` stable to preserve direct links.

The preview notice is automatic. Once all gallery entries are original, it
vanishes and the subtitle becomes “Selected photographs by Mark Whitley”.
Per-image Unsplash credits disappear only for entries marked as original.

## Feature and order

Set `featured: true` on exactly six entries and `false` on the others. Homepage
prints follow `order`; the collection uses the same order. Give each entry a
unique numeric `order` and a unique `id`. The first six flagged images are used
if more than six are marked, but the content check requires exactly six.

## Export recommendations

Use WebP or high-quality JPEG (AVIF is also supported). Export in sRGB, strip
unneeded metadata, and aim for 2000–2560 pixels on the long edge, approximately
250–700 KB depending on detail. Avoid upscaling. Keep an original master elsewhere.
A landscape photograph works best for the cinematic hero; its gallery presentation
is cropped, while the lightbox always shows the complete image. Other images retain
their natural ratio. Next.js generates responsive delivery sizes automatically.
Only the gallery hero is prioritised; remaining images load lazily. Large viewer
images are requested only when opened.

## Temporary sources

These 21 entries are free Unsplash photographs, with original dimensions, author
credits and individual source links verified on 9 November 2026. Their source
pages declare https://unsplash.com/license; Unsplash+ photographs are excluded.
The files are remotely loaded, not committed to this repository. The homepage,
gallery and viewer disclose their placeholder status. Please retain each source
link while its placeholder remains. Recheck licences when selecting new sources.

## Pocket Racers VR

The separate `data/games.ts` entry for `pocket-racers-vr` contains `metaStoreUrl`.
Leave it `undefined` until the real listing exists. Set an official HTTPS Meta
Horizon Store URL when ready: its cards and detail-page CTA then open that listing
in a new tab. No other code changes are necessary.
