export const radians = (degrees: number) => degrees * Math.PI / 180;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Head angles are in radians. Iris offsets are measured on the 640px clay artwork.
export type Gaze = {pitch: number; yaw: number; eyeX: number; eyeY: number};
export const neutral: Gaze = {pitch: 0, yaw: 0, eyeX: 0, eyeY: 0};
const scrollHoldMs = 160;
const swipeResetMs = 180;
export const scrollFadeEndMs = scrollHoldMs + 500;

// Scale distance to the portrait radius. The curve responds quickly near the
// face and still has a little more room to turn as the pointer moves beyond it.
export function pointerGaze(x: number, y: number, centreX: number, centreY: number, width: number, height: number): Gaze {
  const horizontal = Math.tanh(3.2 * (x - centreX) / Math.max(width, 1));
  const vertical = Math.tanh(3.2 * (y - centreY) / Math.max(height, 1));
  return {
    yaw: radians(horizontal * 15),
    pitch: radians(vertical * 10),
    eyeX: horizontal * 7,
    eyeY: vertical * 3,
  };
}

export function swipeTravel(previous: number, delta: number, elapsedMs: number) {
  // Count distance, so a slow drag and a quick swipe can both reach the full
  // pose. On reversal the next few pixels immediately drive the other glance.
  const continuing = elapsedMs < swipeResetMs && Math.sign(delta) === Math.sign(previous);
  return clamp((continuing ? previous : 0) + delta, -24, 24);
}

export function scrollGaze(travel: number, elapsedMs: number): Gaze {
  const fade = clamp((scrollFadeEndMs - elapsedMs) / (scrollFadeEndMs - scrollHoldMs), 0, 1);
  if (!travel || !fade) return neutral;
  // Positive page travel (scrolling down) looks to the viewer's left.
  const sideways = -clamp(travel / 24, -1, 1) * fade;
  return {yaw: radians(sideways * 15), pitch: 0, eyeX: sideways * 7, eyeY: 0};
}

export function smoothGaze(current: Gaze, target: Gaze, seconds: number, touch = false): Gaze {
  const head = 1 - Math.exp(-Math.max(0, seconds) / (touch ? 0.12 : 0.22));
  const eyes = 1 - Math.exp(-Math.max(0, seconds) / 0.075);
  return {
    pitch: current.pitch + (target.pitch - current.pitch) * head,
    yaw: current.yaw + (target.yaw - current.yaw) * head,
    eyeX: current.eyeX + (target.eyeX - current.eyeX) * eyes,
    eyeY: current.eyeY + (target.eyeY - current.eyeY) * eyes,
  };
}

export function settled(a: Gaze, b: Gaze) {
  return Math.abs(a.pitch - b.pitch) < 0.0001 && Math.abs(a.yaw - b.yaw) < 0.0001
    && Math.abs(a.eyeX - b.eyeX) < 0.01 && Math.abs(a.eyeY - b.eyeY) < 0.01;
}
