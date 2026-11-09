import type { Photograph } from "@/data/photography";
export function PhotoCredit({photo}: {photo:Photograph}) {
  return photo.placeholder && photo.sourceUrl ? <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.credit ? `${photo.credit} / Unsplash` : 'Source / Unsplash'} ↗</a> : null;
}
