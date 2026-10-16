/** Transient input only: never persisted or tied to rendering. */
export function joystick(x: number, y: number, radius = 54) {
  const length = Math.hypot(x, y), amount = Math.min(1, length / radius);
  if (!Number.isFinite(length) || amount <= 0.15) return { x: 0, z: 0 };
  const strength = (amount - 0.15) / 0.85;
  return { x: x / length * strength, z: y / length * strength };
}
export class GameInput {
  keys = new Set<string>();
  private held = new Set<string>();
  private blocked = new Set<string>();
  keyDown(code: string, repeat: boolean, enabled: boolean) {
    if (!repeat) this.blocked.delete(code);
    this.held.add(code);
    if (!enabled || this.blocked.has(code) || (repeat && !this.keys.has(code))) { this.blocked.add(code); return; }
    this.keys.add(code);
  }
  keyUp(code: string) { this.held.delete(code); this.blocked.delete(code); this.keys.delete(code); }
  axes = { x: 0, z: 0 };
  look = { x: 0, y: 0 };
  owners: { move: number | null; look: number | null } = { move: null, look: null };
  claim(kind: "move" | "look", id: number) {
    if (this.owners[kind] !== null || Object.values(this.owners).includes(id)) return false;
    this.owners[kind] = id;
    return true;
  }
  release(id: number, cancelled = false) {
    if (this.owners.move === id) { this.owners.move = null; this.axes = { x: 0, z: 0 }; }
    if (this.owners.look === id) {
      this.owners.look = null;
      // A completed swipe still needs its final delta rendered, even after finger-up.
      if (cancelled) this.look = { x: 0, y: 0 };
    }
  }
  movement() {
    const k = this.keys;
    const x = this.axes.x + Number(k.has("KeyD") || k.has("ArrowRight")) - Number(k.has("KeyA") || k.has("ArrowLeft"));
    const z = this.axes.z + Number(k.has("KeyS") || k.has("ArrowDown")) - Number(k.has("KeyW") || k.has("ArrowUp"));
    const length = Math.max(1, Math.hypot(x, z));
    return { x: x / length, z: z / length };
  }
  consumeLook() { const value = this.look; this.look = { x: 0, y: 0 }; return value; }
  reset() { for (const code of this.held) this.blocked.add(code); this.keys.clear(); this.axes = { x: 0, z: 0 }; this.look = { x: 0, y: 0 }; this.owners = { move: null, look: null }; }
}
export const gameInput = new GameInput();

/** Match swipe distance across orientations without amplifying tiny viewports. */
export function touchLookScale(width: number, height: number): number {
  return 390 / Math.max(320, Math.min(width, height));
}

export type InterruptionEvent = "hidden" | "pagehide" | "blur" | "resize";
export function requiresResume(event: InterruptionEvent) {
  return event === "hidden" || event === "pagehide";
}

/** Browser chrome can change height during a swipe; only a width change invalidates its layout. */
export function shouldResetTouchOnResize(previousWidth: number, width: number) {
  return Math.abs(previousWidth - width) > 1;
}
