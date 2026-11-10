import placeholders from "./photography-placeholders.json";
import generated from "./photography-generated.json";

export type PhotoVariant = { src: string; width: number; height: number; bytes: number; format: "avif" | "webp" };
export type Photograph = {
  id: string; src: string; alt: string; title?: string; description?: string; location?: string;
  width: number; height: number; featured: boolean; order: number;
  cameraSettings?: { aperture?: number; shutterSeconds?: number; iso?: number; focalLengthMm?: number };
  placeholder: boolean; credit?: string; sourceUrl?: string; variants?: PhotoVariant[];
};
// Only the published manifest is imported by the site. Private originals and drafts never enter the bundle.
const originals = generated.photos as Photograph[];
const originalIds = new Set(originals.map(photo => photo.id));
export const photographyCollection: Photograph[] = [
  ...(generated.includePlaceholders ? placeholders.filter(photo => !originalIds.has(photo.id)) : []),
  ...originals,
].map(photo => ({...photo, featured: generated.featuredIds.includes(photo.id)}));
export const photographs = [...photographyCollection].sort((a,b) => a.order-b.order || a.id.localeCompare(b.id));
export const featuredPhotographs = photographs.filter(photo => photo.featured);
export const hasPlaceholders = photographs.some(photo => photo.placeholder);
