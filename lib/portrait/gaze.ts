export const radians = (degrees: number) => degrees * Math.PI / 180;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Head angles are in radians. Iris offsets are measured on the 640px clay artwork.
export type Gaze = {pitch: number; yaw: number; eyeX: number; eyeY: number};
export const neutral: Gaze = {pitch: 0, yaw: 0, eyeX: 0, eyeY: 0};
const scrollHoldMs = 90;
export const scrollFadeEndMs = scrollHoldMs + 450;

export function pointerGaze(x: number, y: number, centreX: number, centreY: number, width: number, height: number): Gaze {
  const horizontal = clamp((x - centreX) / Math.max(width / 2, 1), -1, 1);
  const vertical = clamp((y - centreY) / Math.max(height / 2, 1), -1, 1);
  return {
    yaw: radians(horizontal * 8.5),
    pitch: radians(vertical * 6),
    eyeX: horizontal * 3.8,
    eyeY: vertical * 1.9,
  };
}

export function scrollVelocity(delta: number, elapsedMs: number) {
  // The first event of a swipe only describes that event's movement. Time spent
  // reading since the previous swipe must not dilute its direction or speed.
  return delta / clamp(elapsedMs, 8, 32);
}

export function scrollGaze(centreY: number, height: number, velocity: number, elapsedMs: number): Gaze {
  const position = clamp((height / 2 - centreY) / Math.max(height / 2, 1), -1, 1);
  const fade = clamp((scrollFadeEndMs - elapsedMs) / (scrollFadeEndMs - scrollHoldMs), 0, 1);
  const direction = clamp(velocity / 0.65, -1, 1) * fade;
  const pitchDegrees = clamp(position * 7 + direction * 8.5, -11, 11);
  return {yaw: 0, pitch: radians(pitchDegrees), eyeX: 0, eyeY: pitchDegrees / 11 * 1.9};
}

export function smoothGaze(current: Gaze, target: Gaze, seconds: number, touch = false): Gaze {
  const head = 1 - Math.exp(-Math.max(0, seconds) / (touch ? 0.17 : 0.3));
  const eyes = 1 - Math.exp(-Math.max(0, seconds) / 0.1);
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
