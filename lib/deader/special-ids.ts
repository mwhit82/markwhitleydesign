export const SPECIAL_IDS = [
  "mystery-prop",
  "headphones",
  "mini-anomaly",
  "glitch-particles",
  "bent-halo",
  "midnight-crown",
  "static-specs",
  "moon-patch",
  "lost-signal-pack",
  "pocket-moon",
  "porcelain-cracks",
  "shadow-moths",
] as const;
export type SpecialId = (typeof SPECIAL_IDS)[number];
export const isHourlySpecial = (id: string): id is SpecialId =>
  SPECIAL_IDS.includes(id as SpecialId);
