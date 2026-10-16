/** Dawn is a separate phase: reaching the clock boundary is not a reward. */
export type Judgement = { elapsed: number; failed: boolean; mistakes: number };
export const JUDGEMENT_SECONDS = 6;
export const judgementMistakes = (total: number, baseline: number) => Math.max(0, total - baseline);
export const beginJudgement = (mistakes: number): Judgement => ({ elapsed: 0, failed: mistakes >= 3, mistakes });
export const tickJudgement = (state: Judgement, dt: number): Judgement =>
  Number.isFinite(dt) && dt > 0 ? { ...state, elapsed: Math.min(JUDGEMENT_SECONDS, state.elapsed + Math.min(dt, .25)) } : state;
export type Weapon = { collected: boolean; ammo: number; cooldown: number; shots: number; removed: string[] };
export const freshWeapon = (): Weapon => ({ collected: false, ammo: 6, cooldown: 0, shots: 0, removed: [] });
export const spendShot = (w: Weapon): Weapon => !w.collected || w.ammo <= 0 || w.cooldown > 0 ? w : { ...w, ammo: w.ammo - 1, cooldown: .45, shots: w.shots + 1 };
