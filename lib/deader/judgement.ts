import type { DawnEntry } from "./visitors";
/** Dawn is a separate phase: reaching the clock boundary is not a reward. */
export type Judgement = { elapsed: number; failed: boolean; mistakes: number; entries?: DawnEntry[] };
export const JUDGEMENT_INTRO_SECONDS = 3.6;
export const DAWN_SCARE_SECONDS = 3;
export const JUDGEMENT_BLACKOUT_AT = JUDGEMENT_INTRO_SECONDS + DAWN_SCARE_SECONDS;
export const JUDGEMENT_SECONDS = JUDGEMENT_BLACKOUT_AT + 1;
export function dawnScarePose(elapsed: number, gentle: boolean, reduced: boolean) {
  const t = Math.max(0, elapsed - JUDGEMENT_INTRO_SECONDS);
  const active = elapsed >= JUDGEMENT_INTRO_SECONDS && elapsed < JUDGEMENT_BLACKOUT_AT;
  const approach = Math.min(1, t / .18);
  const retreat = Math.max(0, (t - 2.65) / .35);
  const shake = active && !gentle && !reduced ? Math.min(1, t / .12) * (1 - retreat) : 0;
  return { active, distance: gentle ? 1.5 : 1.9 - approach * .85 + retreat * .35,
    x: shake ? Math.sin(t * 47) * .028 * shake : 0, y: shake ? Math.sin(t * 59) * .022 * shake : 0,
    roll: shake ? (Math.sin(t * 41) + Math.sin(t * 67) * .35) * .035 * shake : 0 };
}
export const judgementMistakes = (total: number, baseline: number) => Math.max(0, total - baseline);
export const beginJudgement = (mistakes: number): Judgement => ({ elapsed: 0, failed: mistakes >= 3, mistakes });
export const processionEntries = (entries: DawnEntry[]) => entries.filter(e => e.profile.behaviour !== "mimic");
export const judgementDuration = (j: Judgement) => j.entries ? j.entries.length * 3 + 4 : JUDGEMENT_SECONDS;
export const currentReveal = (j: Judgement) => j.entries?.[Math.floor(j.elapsed / 3)];
export const revealCaption = (e: DawnEntry) => {
 const n=[...e.id].reduce((a,c)=>a+c.charCodeAt(0),0)%3;
 if(e.shot) return e.profile.kind === "anomaly" ? ["You got lucky this time.","That was a lucky shot.","Next time, look behind you."][n] : ["I only needed shelter.","I meant you no harm.","I wish you had trusted me."][n];
 if(e.profile.kind === "anomaly")return "";
 return e.decision === "admit" ? ["Thank you for keeping me safe.","Thank you. I made it through the night.","I won't forget your kindness."][n] : ["Goodbye. I found somewhere else to shelter.","Take care of yourself tonight.","Maybe next time you'll trust me."][n];
};
export const skipReveal = (j: Judgement, all=false): Judgement => ({...j,elapsed:Math.min(judgementDuration(j)-4, all ? judgementDuration(j)-4 : (Math.floor(j.elapsed/3)+1)*3)});
export const tickJudgement = (state: Judgement, dt: number): Judgement =>
  Number.isFinite(dt) && dt > 0 ? { ...state, elapsed: Math.min(judgementDuration(state), state.elapsed + Math.min(dt, .25)) } : state;
export type Weapon = { collected: boolean; ammo: number; cooldown: number; shots: number; removed: string[] };
export const freshWeapon = (): Weapon => ({ collected: false, ammo: 6, cooldown: 0, shots: 0, removed: [] });
export const spendShot = (w: Weapon): Weapon => !w.collected || w.ammo <= 0 || w.cooldown > 0 ? w : { ...w, ammo: w.ammo - 1, cooldown: .45, shots: w.shots + 1 };
