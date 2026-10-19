export const SPECIAL_IDS = [
  "mystery-prop",
  "headphones",
  "mini-anomaly",
  "glitch-particles",
] as const;
export type SpecialId = (typeof SPECIAL_IDS)[number];
export const isHourlySpecial = (id: string): id is SpecialId =>
  SPECIAL_IDS.includes(id as SpecialId);
