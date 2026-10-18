import {defaultVRSettings, readVRSettings, type VRSettings} from "./vr";
/** Presentation never deducts trust: the encounter decision is the sole authority. */
export type SurvivalPhase =
  "idle" | "tension" | "lunge" | "recovery" | "donut" | "blackout" | "gameover";
export type Survival = {
  phase: SurvivalPhase;
  elapsed: number;
  kind: "anomaly" | "mistake";
  encounterId: string | null;
};
export const freshSurvival = (): Survival => ({
  phase: "idle",
  elapsed: 0,
  kind: "mistake",
  encounterId: null,
});
export const survivalBusy = (s: Survival) => s.phase !== "idle";
export function beginSurvival(id: string, admitted: boolean): Survival {
  return {
    phase: "tension",
    elapsed: 0,
    kind: admitted ? "anomaly" : "mistake",
    encounterId: id,
  };
}
const durations = {
  tension: 1.1,
  lunge: 0.65,
  recovery: 1.5,
  donut: 2.5,
  blackout: 0.9,
};
export function tickSurvival(
  s: Survival,
  dt: number,
  _trust: number,
  paused: boolean,
  doorOpen: boolean,
): Survival {
  if (
    paused ||
    s.phase === "idle" ||
    s.phase === "gameover" ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return s;
  if (s.phase === "tension" && s.kind === "anomaly" && !doorOpen) return s;
  const elapsed = s.elapsed + Math.min(dt, 0.25);
  if (elapsed + 1e-8 < durations[s.phase]) return { ...s, elapsed };
  const phase: SurvivalPhase =
    s.phase === "tension"
      ? s.kind === "anomaly"
        ? "lunge"
        : "recovery"
      : s.phase === "lunge"
        ? "recovery"
        : s.phase === "recovery"
          ? "idle"
          : s.phase === "donut"
            ? "blackout"
            : "gameover";
  return { ...s, phase, elapsed: 0 };
}
export const donutMood = (trust: number) =>
  trust >= 3
    ? "calm"
    : trust === 2
      ? "watchful"
      : trust === 1
        ? "agitated"
        : "furious";
export type Settings = {
  vr: VRSettings;
  controls: "auto" | "touch" | "keyboard";
  touchSensitivity: number;
  volume: number;
  ambience: number;
  sensitivity: number;
  resolution: number;
  shadows: boolean;
  effects: boolean;
  muted: boolean;
  reducedMotion: boolean;
  reducedFlashes: boolean;
  gentleScares: boolean;
  quality: "standard" | "low";
};
export const defaultSettings = (): Settings => ({
  vr: defaultVRSettings(),
  controls: "auto",
  touchSensitivity: 1,
  volume: 0.6,
  ambience: 0.5,
  sensitivity: 1,
  resolution: 1.5,
  shadows: true,
  effects: true,
  muted: false,
  reducedMotion: false,
  reducedFlashes: false,
  gentleScares: false,
  quality: "standard",
});
export function readSettings(value: unknown): Settings {
  const d = defaultSettings();
  if (!value || typeof value !== "object") return d;
  const s = value as Record<string, unknown>;
  const range = (key: string, min: number, max: number, fallback: number) =>
    typeof s[key] === "number" && Number.isFinite(s[key])
      ? Math.max(min, Math.min(max, s[key] as number))
      : fallback;
  return {
    vr: readVRSettings(s.vr),
    controls: s.controls === "touch" || s.controls === "keyboard" ? s.controls : "auto",
    touchSensitivity: range("touchSensitivity", 0.3, 2, 1),
    ambience: range("ambience", 0, 1, d.ambience),
    sensitivity: range("sensitivity", 0.3, 2, d.sensitivity),
    resolution: range("resolution", 0.75, 1.5, d.resolution),
    shadows: s.shadows !== false,
    effects: s.effects !== false,
    volume:
      typeof s.volume === "number" && Number.isFinite(s.volume)
        ? Math.max(0, Math.min(1, s.volume))
        : d.volume,
    muted: s.muted === true,
    reducedMotion: s.reducedMotion === true,
    reducedFlashes: s.reducedFlashes === true,
    gentleScares: s.gentleScares === true,
    quality: s.quality === "low" ? "low" : "standard",
  };
}
