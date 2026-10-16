import type { Encounters } from "./visitors";
import { recordStory } from "./progression";
import type { Session, Save } from "./game";
import { reward } from "./game";

export const NIGHT_ONE_ARRIVALS = [12, 90, 170, 250, 330, 410, 480] as const;
export const NIGHT_ONE_VISITORS = [
  "bea",
  "three",
  "pippa",
  "echo",
  "sam",
  "grin",
  "three",
] as const;
export const NIGHT_TITLES = [
  "They’re Here",
  "Trust Nobody",
  "The Anomalous",
] as const;
export type Night = {
  number: number;
  mode: "normal" | "infinite";
  difficulty: "easy" | "medium" | "hard";
  nextArrival: number;
  endingSeconds: number;
  elapsed: number;
  duration: 300 | 60;
  status: "running" | "completed" | "failed";
  introFinished: boolean;
  cancelledVisitor: boolean;
};
export const freshNight = (
  duration: 300 | 60 = 300,
  session?: Session,
): Night => ({
  number: session?.night ?? 1,
  mode: session?.mode ?? "normal",
  difficulty: session?.difficulty ?? "easy",
  nextArrival: 12,
  endingSeconds: 0,
  elapsed: 0,
  duration,
  status: "running",
  introFinished: true,
  cancelledVisitor: false,
});
/** The clock uses 600 story units; production takes 300 real seconds, rehearsal 60. */
export const nightRate = (night: Night | null) =>
  night ? 600 / night.duration : 1;
export function advanceNight(
  night: Night,
  delta: number,
  paused: boolean,
  trust: number,
): Night {
  if (night.status !== "running") return night;
  if (trust <= 0) return { ...night, status: "failed" };
  if (paused || !Number.isFinite(delta) || delta <= 0) return night;
  const elapsed = Math.min(
    night.mode === "infinite" ? Number.MAX_SAFE_INTEGER : 600,
    night.elapsed + Math.min(delta, 0.25) * nightRate(night),
  );
  return {
    ...night,
    elapsed: night.mode === "normal" && elapsed >= 600 - 1e-8 ? 600 : elapsed,
    number:
      night.mode === "infinite" ? Math.floor(elapsed / 600) + 1 : night.number,
    status:
      night.mode === "normal" && elapsed >= 600 - 1e-8
        ? "completed"
        : "running",
  };
}
export function infiniteInterval(night: Night) {
  return Math.max(
    35,
    { easy: 75, medium: 60, hard: 48 }[night.difficulty] -
      Math.min(10, night.number - 1) * 3,
  );
}
export function storyArrivals(night: Night): number[] {
  if (night.number === 1 && night.difficulty === "easy")
    return [...NIGHT_ONE_ARRIVALS];
  const count = Math.min(
    13,
    7 +
      (night.number - 1) * 2 +
      { easy: 0, medium: 1, hard: 2 }[night.difficulty],
  );
  return Array.from({ length: count }, (_, i) => 12 + i * (468 / (count - 1)));
}
export function scheduledVisitor(
  night: Night,
  encounters: Encounters,
): string | null {
  if (night.status !== "running" || encounters.active) return null;
  const i = encounters.sequence;
  if (night.mode === "infinite") {
    if (night.elapsed < night.nextArrival) return null;
    const pool = [
      "bea",
      "echo",
      "pippa",
      "grin",
      "sam",
      "three",
      "porter",
      "loop",
      "tenant",
    ];
    return pool[(Math.imul(encounters.seed, 1664525) >>> 0) % pool.length];
  }
  const times = storyArrivals(night);
  if (i >= times.length || night.elapsed < times[i]) return null;
  if (night.number === 1 && i < 7) return NIGHT_ONE_VISITORS[i];
  const pool =
    night.number === 2
      ? ["pippa", "loop", "sam", "echo", "porter", "grin", "three"]
      : ["tenant", "echo", "loop", "bea", "porter", "three", "grin"];
  return pool[(i + (night.difficulty === "hard" ? 1 : 0)) % pool.length];
}
export function completeNightReward(
  save: Save,
  night: Night,
  runId: string,
): Save {
  if (save.claimedRewards.includes(`night:${night.number}:${runId}`))
    return save;
  return night.status === "completed" &&
    night.mode === "normal" &&
    night.duration === 300 &&
    runId
    ? recordStory(
        reward(save, `night:${night.number}:${runId}`, 50, night.number),
        night.number,
        night.difficulty,
      )
    : save;
}
