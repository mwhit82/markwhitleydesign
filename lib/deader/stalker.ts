/** Harmless, transient encounter; timing is owned by the simulation, never renders. */
export type StalkerPhase =
  "idle" | "camera" | "retreat" | "pending-room" | "room" | "dismiss";
export type StalkerState = {
  shift: number;
  index: number;
  phase: StalkerPhase;
  elapsed: number;
  watched: number;
  gaze: number;
  feed: number;
  previousFeed: number;
  anchor: number;
  follow: boolean;
  delay: number;
};
export const freshStalker = (shift = 1): StalkerState => ({
  shift,
  index: 0,
  phase: "idle",
  elapsed: 0,
  watched: 0,
  gaze: 0,
  feed: 0,
  previousFeed: -1,
  anchor: -1,
  follow: false,
  delay: 3,
});
export type StalkerSight = { camera: boolean; gaze: boolean; anchor: number };
export const emptyStalkerSight = (): StalkerSight => ({
  camera: false,
  gaze: false,
  anchor: -1,
});
function random(seed: string, n: number) {
  let h = 2166136261;
  for (const c of `${seed}:${n}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
export function stalkerSchedule(seed: string, shift: number) {
  return {
    first: 60 + random(seed, shift * 31) * 40,
    second: 170 + random(seed, shift * 31 + 1) * 40,
    twice: random(seed, shift * 31 + 2) < 0.5,
  };
}
export function dismissStalker(s: StalkerState): StalkerState {
  return s.phase === "room" ? { ...s, phase: "dismiss", elapsed: 0 } : s;
}
export function tickStalker(
  s: StalkerState,
  dt: number,
  input: {
    seed: string;
    shift: number;
    seconds: number;
    running: boolean;
    paused: boolean;
    defer: boolean;
    exploring: boolean;
    sight: StalkerSight;
  },
): StalkerState {
  if (!input.running) return freshStalker(input.shift);
  if (s.shift !== input.shift) s = freshStalker(input.shift);
  if (input.paused || !Number.isFinite(dt) || dt <= 0) return s;
  dt = Math.min(dt, 0.25);
  const done = (): StalkerState => ({
    ...s,
    phase: "idle",
    index: s.index + 1,
    elapsed: 0,
    watched: 0,
    gaze: 0,
    anchor: -1,
    previousFeed: s.feed,
  });
  if (s.phase === "idle") {
    const plan = stalkerSchedule(input.seed, input.shift),
      at =
        s.index === 0
          ? plan.first
          : s.index === 1 && plan.twice
            ? plan.second
            : Infinity;
    if (input.defer || input.seconds < at) return s;
    let feed = Math.floor(
      random(input.seed, input.shift * 101 + s.index * 7) * 6,
    );
    if (feed === s.previousFeed) feed = (feed + 1) % 6;
    return {
      ...s,
      phase: "camera",
      feed,
      elapsed: 0,
      follow: random(input.seed, input.shift * 101 + s.index * 7 + 1) < 0.5,
      delay: 3 + random(input.seed, input.shift * 101 + s.index * 7 + 2) * 3,
    };
  }
  if (s.phase === "camera") {
    const elapsed = s.elapsed + dt,
      watched = s.watched + (s.watched > 0 || input.sight.camera ? dt : 0);
    if (watched >= 0.8 - 1e-8)
      return { ...s, phase: "retreat", elapsed: 0, watched };
    if (elapsed >= 25) return done();
    return { ...s, elapsed, watched };
  }
  if (s.phase === "retreat")
    return s.elapsed + dt >= 0.7
      ? s.follow
        ? { ...s, phase: "pending-room", elapsed: 0 }
        : done()
      : { ...s, elapsed: s.elapsed + dt };
  if (s.phase === "pending-room") {
    if (!input.exploring || input.defer) return s;
    const elapsed = s.elapsed + dt;
    return elapsed >= s.delay && input.sight.anchor >= 0
      ? { ...s, phase: "room", anchor: input.sight.anchor, elapsed: 0, gaze: 0 }
      : { ...s, elapsed };
  }
  if (s.phase === "room") {
    const gaze = input.exploring && input.sight.gaze ? s.gaze + dt : 0;
    return gaze >= 0.8 - 1e-8
      ? dismissStalker(s)
      : { ...s, gaze, elapsed: s.elapsed + dt };
  }
  return s.elapsed + dt >= 0.7 ? done() : { ...s, elapsed: s.elapsed + dt };
}
export function stalkerGaze(
  direction: { x: number; y: number; z: number },
  offset: { x: number; y: number; z: number },
  unblocked: boolean,
) {
  const length = Math.hypot(offset.x, offset.y, offset.z);
  return (
    unblocked &&
    length > 0.01 &&
    (direction.x * offset.x + direction.y * offset.y + direction.z * offset.z) /
      length >=
      Math.cos(Math.PI / 15)
  );
}
/** Feet positions beside existing cover; exterior positions follow the six feeds. */
export const STALKER_CAMERA = [
  { p: [-3.5, 0, -2.7], yaw: 0.5, side: -1 },
  { p: [-1.85, 3.25, -5.7], yaw: 0, side: -1 },
  { p: [2.65, -0.4, -8.8], yaw: -0.65, side: 1 },
  { p: [-2.15, 0, -5.1], yaw: 2.4, side: -1 },
  { p: [1.05, 0, -4.5], yaw: Math.PI, side: 1 },
  { p: [3.5, 0, 9.6], yaw: -2.3, side: 1 },
] as const;
export const STALKER_ROOM = [
  { p: [-3.5, 0, -2.65], yaw: 0.65, side: -1 },
  { p: [3.5, 0, -2.7], yaw: -0.65, side: 1 },
  { p: [-3.5, 0, 9.6], yaw: 2.5, side: -1 },
  { p: [3.5, 0, 9.6], yaw: -2.5, side: 1 },
] as const;

/** Written only by development fixtures; never saved. */
export const stalkerDebug = { hold: false };
