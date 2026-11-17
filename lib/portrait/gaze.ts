export const radians = (degrees: number) => degrees * Math.PI / 180;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export type Gaze = {pitch: number; yaw: number; eyePitch: number; eyeYaw: number};
export const neutral: Gaze = {pitch: 0, yaw: 0, eyePitch: 0, eyeYaw: 0};
export function pointerGaze(x: number, y: number, centreX: number, centreY: number, width: number, height: number): Gaze {
  const horizontal = clamp((x-centreX)/Math.max(width/2, 1), -1, 1);
  const vertical = clamp((y-centreY)/Math.max(height/2, 1), -1, 1);
  return {yaw: radians(horizontal*20), pitch: radians(vertical*12), eyeYaw: radians(horizontal*10), eyePitch: radians(vertical*6)};
}
export function scrollGaze(centreY: number, height: number, velocity: number, elapsed: number): Gaze {
  const position = clamp((height/2-centreY)/Math.max(height/2, 1), -1, 1);
  const direction = clamp(velocity/.8, -1, 1) * clamp(1-elapsed/400, 0, 1);
  const pitch = radians(clamp(position*8+direction*4, -12, 12));
  return {yaw: 0, pitch, eyeYaw: 0, eyePitch: pitch*.5};
}
export function smoothGaze(current: Gaze, target: Gaze, seconds: number): Gaze {
  const head = 1-Math.exp(-Math.max(0, seconds)/.3), eyes = 1-Math.exp(-Math.max(0, seconds)/.1);
  return {pitch: current.pitch+(target.pitch-current.pitch)*head, yaw: current.yaw+(target.yaw-current.yaw)*head, eyePitch: current.eyePitch+(target.eyePitch-current.eyePitch)*eyes, eyeYaw: current.eyeYaw+(target.eyeYaw-current.eyeYaw)*eyes};
}
export function settled(a: Gaze, b: Gaze) {
  return (Object.keys(a) as (keyof Gaze)[]).every(key => Math.abs(a[key]-b[key]) < .0001);
}
