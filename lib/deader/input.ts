/** Transient input only: never persisted or tied to rendering. */
export function joystick(x: number, y: number, radius = 54) {
  const length = Math.hypot(x, y), amount = Math.min(1, length / radius);
  if (!Number.isFinite(length) || amount <= 0.15) return { x: 0, z: 0 };
  const strength = (amount - 0.15) / 0.85;
  return { x: x / length * strength, z: y / length * strength };
}
export class GameInput {
  keys = new Set<string>();
  axes = { x: 0, z: 0 };
  look = { x: 0, y: 0 };
  owners: { move: number | null; look: number | null } = { move: null, look: null };
  claim(kind: "move" | "look", id: number) {
    if (this.owners[kind] !== null || Object.values(this.owners).includes(id)) return false;
    this.owners[kind] = id;
    return true;
  }
  release(id: number) {
    if (this.owners.move === id) { this.owners.move = null; this.axes = { x: 0, z: 0 }; }
    if (this.owners.look === id) { this.owners.look = null; this.look = { x: 0, y: 0 }; }
  }
  movement() {
    const k = this.keys;
    const x = this.axes.x + Number(k.has("KeyD") || k.has("ArrowRight")) - Number(k.has("KeyA") || k.has("ArrowLeft"));
    const z = this.axes.z + Number(k.has("KeyS") || k.has("ArrowDown")) - Number(k.has("KeyW") || k.has("ArrowUp"));
    const length = Math.max(1, Math.hypot(x, z));
    return { x: x / length, z: z / length };
  }
  consumeLook() { const value = this.look; this.look = { x: 0, y: 0 }; return value; }
  reset() { this.keys.clear(); this.axes = { x: 0, z: 0 }; this.look = { x: 0, y: 0 }; this.owners = { move: null, look: null }; }
}
export const gameInput = new GameInput();

/** An interruption must never downgrade the portrait lock to a resumable pause. */
export function interruptionReason(touch: boolean, width: number, height: number): "portrait" | "interrupted" {
  return touch && height > width ? "portrait" : "interrupted";
}
