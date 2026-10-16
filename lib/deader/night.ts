import { VISITORS } from "./visitors";
import type { Encounters } from "./visitors";
import { recordStory } from "./progression";
import type { Session, Save } from "./game";
import { reward } from "./game";

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
  status: "running" | "judging" | "completed" | "failed";
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
  _trust: number,
): Night {
  void _trust; // Legacy mood value no longer determines defeat.
  if (night.status !== "running") return night;
  if (paused || !Number.isFinite(delta) || delta <= 0) return night;
  const elapsed = Math.min(
    night.mode === "infinite" ? night.number * 600 : 600,
    night.elapsed + Math.min(delta, 0.25) * nightRate(night),
  );
  return {
    ...night,
    elapsed: night.mode === "normal" && elapsed >= 600 - 1e-8 ? 600 : elapsed,
    number:
      night.number,
    status:
      elapsed >= (night.mode === "infinite" ? night.number * 600 : 600) - 1e-8
        ? "judging"
        : "running",
  };
}
export function infiniteInterval(night: Night) { return 540 / ({easy:10,medium:12,hard:14}[night.difficulty] - 1); }
export function storyArrivals(night: Night): number[] {
  const count = {easy:10,medium:12,hard:14}[night.difficulty];
  return Array.from({length:count},(_,i)=>12+i*540/(count-1));
}
/** A reproducible bag per run; all identities appear before any repeat. */
export function shuffledVisitor(runId: string, index: number): string {
  let seed = [...runId].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,927);
  let previous = "";
  for(let cycle=0; cycle<=Math.floor(index/VISITORS.length); cycle++) {
    const bag=VISITORS.map(v=>v.id);
    for(let i=bag.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[bag[i],bag[j]]=[bag[j],bag[i]];}
    if(bag[0]===previous)[bag[0],bag[1]]=[bag[1],bag[0]];
    if(cycle===Math.floor(index/VISITORS.length))return bag[index%bag.length];
    previous=bag[bag.length-1];
  }
  return "bea";
}
export function scheduledVisitor(night: Night, encounters: Encounters): string | null {
  if(night.status!=="running" || encounters.active || night.elapsed < night.nextArrival) return null;
  // No new approaches in the final fifteen seconds. A delayed decision never creates a burst.
  const shiftTime=night.mode==="infinite"?night.elapsed-(night.number-1)*600:night.elapsed;
  if(shiftTime>=570)return null;
  return shuffledVisitor(encounters.runId,encounters.sequence);
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
