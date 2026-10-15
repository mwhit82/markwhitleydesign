import type { Save } from "./game";
export const achievements = [
  {
    id: "first-survivor",
    name: "First Survivor",
    description: "Complete Night 1 on any difficulty.",
    coins: 20,
  },
  {
    id: "trust-expert",
    name: "Trust Expert",
    description:
      "Complete a story night with no mistakes and at least one correct decision.",
    coins: 30,
  },
  {
    id: "triple-threat",
    name: "Triple Threat",
    description:
      "Complete all three story nights. Includes the one-time story bonus.",
    coins: 150,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description:
      "Survive five Infinite nights in total, across any number of runs.",
    coins: 25,
  },
  {
    id: "fashion-cone",
    name: "Fashion Cone",
    description: "Own five purchased cosmetics. Classic Yellow does not count.",
    coins: 20,
  },
] as const;
export type AchievementId = (typeof achievements)[number]["id"];
export const readAchievements = (v: unknown): AchievementId[] =>
  Array.isArray(v)
    ? [
        ...new Set(
          v.filter((id): id is AchievementId =>
            achievements.some((a) => a.id === id),
          ),
        ),
      ]
    : [];
export function unlockAchievements(s: Save, perfectNight = false): Save {
  const conditions = [
    s.completedNights >= 1,
    perfectNight,
    s.completedNights >= 3,
    s.infiniteRecords.totalNights >= 5,
    s.owned.filter((id) => id !== "yellow").length +
      s.ownedAccessories.length >=
      5,
  ];
  const newly = achievements
    .filter((a, i) => conditions[i] && !s.achievements.includes(a.id))
    .map((a) => a.id);
  return newly.length
    ? { ...s, achievements: [...s.achievements, ...newly] }
    : s;
}
export function claimAchievement(s: Save, id: AchievementId): Save {
  const a = achievements.find((a) => a.id === id),
    key = `achievement:${id}`;
  if (!a || !s.achievements.includes(id) || s.claimedRewards.includes(key))
    return s;
  return {
    ...s,
    coins: s.coins + a.coins,
    claimedRewards: [...s.claimedRewards, key],
  };
}
