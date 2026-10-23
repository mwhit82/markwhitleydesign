import { roomFloor } from "./kitchen";
/** Meta Quest Browser keeps the OculusBrowser token, including desktop mode.
 * https://developers.meta.com/vr/documentation/web/browser-specs/
 * This is a UI gate; immersive-vr support is checked separately before enabling XR.
 */
export const isQuestBrowser = (userAgent: string): boolean =>
  /\bOculusBrowser\/\d/.test(userAgent);

/** Pure Quest preferences and locomotion maths; independent of rendering. */
export type VRSettings = {
  movement: "smooth" | "teleport";
  turning: "smooth" | "snap";
  walkSpeed: number;
  turnSpeed: number;
  leftHanded: boolean;
  seated: boolean;
  vignette: boolean;
};
export const defaultVRSettings = (): VRSettings => ({
  movement: "smooth",
  turning: "smooth",
  walkSpeed: 1.5,
  turnSpeed: 60,
  leftHanded: false,
  seated: false,
  vignette: false,
});
export function readVRSettings(value: unknown): VRSettings {
  const d = defaultVRSettings();
  if (!value || typeof value !== "object") return d;
  const v = value as Record<string, unknown>;
  const number = (key: string, lo: number, hi: number, fallback: number) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? Math.max(lo, Math.min(hi, v[key] as number))
      : fallback;
  return {
    movement: v.movement === "teleport" ? "teleport" : "smooth",
    turning: v.turning === "snap" ? "snap" : "smooth",
    walkSpeed: number("walkSpeed", 0.5, 2, 1.5),
    turnSpeed: number("turnSpeed", 15, 90, 60),
    leftHanded: v.leftHanded === true,
    seated: v.seated === true,
    vignette: v.vignette === true,
  };
}
export function vrAxes(x = 0, z = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { x: 0, z: 0 };
  const n = Math.hypot(x, z);
  if (n <= 0.2) return { x: 0, z: 0 };
  const a = Math.min(1, (n - 0.2) / 0.8);
  return { x: (x / n) * a, z: (z / n) * a };
}
export function vrDelta(dt: number) {
  return Number.isFinite(dt) ? Math.max(0, Math.min(0.05, dt)) : 0;
}
export function rotateOrigin(
  origin: { x: number; z: number },
  head: { x: number; z: number },
  angle: number,
) {
  const x = origin.x - head.x,
    z = origin.z - head.z;
  return {
    x: head.x + x * Math.cos(angle) + z * Math.sin(angle),
    z: head.z - x * Math.sin(angle) + z * Math.cos(angle),
  };
}

/** A teleport cannot skip walls, doorway partitions or furniture. */
export function validVRFloor(
  p: { x: number; z: number },
  scene: "lobby" | "room",
  obstacles: { x: number; z: number; hx: number; hz: number }[],
  radius = 0.25,
) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  if (
    scene === "lobby"
      ? Math.abs(p.x) > 4.7 || Math.abs(p.z) > 4.7
      : !roomFloor(p)
  )
    return false;
  return !obstacles.some(
    (o) =>
      Math.abs(p.x - o.x) < o.hx + radius &&
      Math.abs(p.z - o.z) < o.hz + radius,
  );
}
export function validVRTeleport(
  from: { x: number; z: number },
  to: { x: number; z: number },
  valid: (p: { x: number; z: number }) => boolean,
) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  if (!Number.isFinite(distance) || distance > 5) return false;
  const steps = Math.max(1, Math.ceil(distance / 0.05));
  for (let i = 0; i <= steps; i++)
    if (
      !valid({
        x: from.x + ((to.x - from.x) * i) / steps,
        z: from.z + ((to.z - from.z) * i) / steps,
      })
    )
      return false;
  return true;
}

/** Conservative full-width panel placement; render overlay is the tight-space fallback. */
export function placeVRPanel(
  head: { x: number; y: number; z: number },
  direction: { x: number; z: number },
  scene: "lobby" | "room",
  obstacles: { x: number; z: number; hx: number; hz: number }[] = [],
) {
  const yaw = Math.atan2(direction.x, direction.z);
  for (const distance of [1.2, 1, 0.8, 0.6])
    for (const offset of [0, 0.35, -0.35, 0.7, -0.7, Math.PI]) {
      const angle = yaw + offset,
        x = head.x + Math.sin(angle) * distance,
        z = head.z + Math.cos(angle) * distance;
      const right = { x: Math.cos(angle), z: -Math.sin(angle) };
      if (
        [-0.7, 0, 0.7].every((t) =>
          validVRFloor(
            { x: x + right.x * t, z: z + right.z * t },
            scene,
            obstacles,
          ),
        )
      )
        return { x, y: Math.max(0.65, head.y - 0.18), z };
    }
  return {
    x: head.x + Math.sin(yaw) * 0.6,
    y: Math.max(0.65, head.y - 0.18),
    z: head.z + Math.cos(yaw) * 0.6,
  };
}
export const VR_GUN_YAW = Math.PI;
export const VR_MUZZLE = [0, 0.18, -0.375] as const;
export function validVRDecision(
  room: {
    view: string;
    door: string;
    encounters: { active: { id: string; phase: string } | null };
  },
  id: string,
) {
  return (
    ["door", "inspect", "cctv"].includes(room.view) &&
    ["VISITOR_WAITING", "INSPECTING", "OPEN"].includes(room.door) &&
    room.encounters.active?.id === id &&
    room.encounters.active.phase === "waiting"
  );
}
