/** Dawn is a separate phase: reaching the clock boundary is not a reward. */
export type Judgement = { elapsed: number; failed: boolean; mistakes: number };
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
export const tickJudgement = (state: Judgement, dt: number): Judgement =>
  Number.isFinite(dt) && dt > 0 ? { ...state, elapsed: Math.min(JUDGEMENT_SECONDS, state.elapsed + Math.min(dt, .25)) } : state;
export type Weapon = { collected: boolean; ammo: number; cooldown: number; shots: number; removed: string[] };
export const freshWeapon = (): Weapon => ({ collected: false, ammo: 6, cooldown: 0, shots: 0, removed: [] });
export const spendShot = (w: Weapon): Weapon => !w.collected || w.ammo <= 0 || w.cooldown > 0 ? w : { ...w, ammo: w.ammo - 1, cooldown: .45, shots: w.shots + 1 };
