import type { Settings } from "./survival";
export type AnimationState =
  | "idle"
  | "walk"
  | "turn"
  | "knock"
  | "talk"
  | "suspicious"
  | "attack"
  | "react";
export function characterPose(
  state: AnimationState,
  time: number,
  reduced = false,
) {
  if (reduced) return { bob: 0, tilt: 0, arm: 0, jaw: 1 };
  return {
    bob:
      Math.sin(time * (state === "walk" ? 12 : 2)) *
      (state === "walk" ? 0.025 : 0.012),
    tilt:
      state === "suspicious"
        ? Math.sin(time * 1.5) * 0.06
        : state === "attack"
          ? -0.16
          : state === "react"
            ? 0.08
            : state === "turn"
              ? 0.04
              : 0,
    arm:
      state === "knock"
        ? -0.8 + Math.sin(time * 13) * 0.22
        : state === "talk"
          ? Math.sin(time * 5) * 0.12
          : state === "attack"
            ? -1.1
            : 0,
    jaw: state === "talk" ? 1 + Math.abs(Math.sin(time * 9)) * 0.4 : 1,
  };
}
export function scareVariant(visitor: string) {
  return visitor === "three"
    ? "rush"
    : visitor === "grin" || visitor === "tenant"
      ? "lean"
      : "stutter";
}
export function attackAmount(
  variant: ReturnType<typeof scareVariant>,
  elapsed: number,
) {
  const t = Math.max(0, Math.min(1, elapsed / 0.65));
  return variant === "lean"
    ? t * 0.48
    : variant === "stutter"
      ? t < 0.45
        ? t * 0.25
        : 0.1125 + ((t - 0.45) / 0.55) * 0.7875
      : t * t;
}
export function renderScale(settings: Settings) {
  return Math.min(settings.resolution, settings.quality === "low" ? 1 : 1.5);
}
export function ambienceLevel(seconds: number) {
  // A smooth eight-second quiet gap each minute; no abrupt gain changes.
  const t = ((seconds % 60) + 60) % 60;
  return t < 44
    ? 1
    : t < 48
      ? 1 - ((t - 44) / 4) * 0.9
      : t < 56
        ? 0.1
        : 0.1 + ((t - 56) / 4) * 0.9;
}
