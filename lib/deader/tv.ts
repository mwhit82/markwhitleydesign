export const TV_POSITION = [3.48, 2.35, -.65] as const;
/** Listener stays at the physical player even while using CCTV. */
export function tvSound(x: number, z: number, yaw: number) {
  const dx = TV_POSITION[0] - x, dz = TV_POSITION[2] - z;
  const distance = Math.hypot(dx, dz);
  const pan = Math.max(-1, Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, distance)));
  const facing = (-dx * Math.sin(yaw) - dz * Math.cos(yaw)) / Math.max(.01, distance);
  return { pan, gain: 1 / (1 + distance * distance * .22), captions: distance < 3.8 && facing > .78 };
}
export function loopBroadcast(seconds: number, delta: number, duration: number) {
  if (!Number.isFinite(delta) || delta <= 0 || duration <= 0) return seconds;
  return (seconds + Math.min(delta, .25)) % duration;
}
