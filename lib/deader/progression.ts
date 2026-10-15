import type { Difficulty, Save } from "./game";
export type Records = {
  streak: number;
  night: number;
  correct: number;
  totalNights: number;
};
export const emptyRecords = (): Records => ({
  streak: 0,
  night: 0,
  correct: 0,
  totalNights: 0,
});
export const count = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : 0;
export function readRecords(raw: unknown): Records {
  const s =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    streak: count(s.streak),
    night: count(s.night),
    correct: count(s.correct),
    totalNights: count(s.totalNights),
  };
}
export function unlockedNight(save: Save) {
  return Math.min(3, save.completedNights + 1);
}
export function recordStory(
  save: Save,
  night: number,
  difficulty: Difficulty,
): Save {
  return {
    ...save,
    completions: {
      ...save.completions,
      [difficulty]: [
        ...new Set([
          ...save.completions[difficulty],
          Math.max(1, Math.min(3, night)),
        ]),
      ].sort(),
    },
  };
}
export function recordInfinite(save: Save, records: Records): Save {
  return {
    ...save,
    infiniteBest: Math.max(save.infiniteBest, records.correct),
    infiniteRecords: {
      streak: Math.max(save.infiniteRecords.streak, records.streak),
      night: Math.max(save.infiniteRecords.night, records.night),
      correct: Math.max(save.infiniteRecords.correct, records.correct),
      totalNights: save.infiniteRecords.totalNights,
    },
  };
}

export function recordInfiniteNight(
  save: Save,
  runId: string,
  number: number,
): Save {
  const id = `infinite-night:${runId}:${number}`;
  if (
    !runId ||
    number < 1 ||
    !Number.isSafeInteger(number) ||
    save.claimedRewards.includes(id)
  )
    return save;
  return {
    ...save,
    claimedRewards: [...save.claimedRewards, id],
    infiniteRecords: {
      ...save.infiniteRecords,
      totalNights: save.infiniteRecords.totalNights + 1,
    },
  };
}

export function readCompletions(raw: unknown): Record<Difficulty, number[]> {
  const s =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const valid = (v: unknown) =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter((n): n is number => n === 1 || n === 2 || n === 3),
          ),
        ].sort()
      : [];
  return { easy: valid(s.easy), medium: valid(s.medium), hard: valid(s.hard) };
}
