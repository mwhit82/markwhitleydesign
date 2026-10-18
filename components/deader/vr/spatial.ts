import * as THREE from "three";
/** Only registered screen hit areas are tested each frame. Never scan the scene for UI. */
export const uiTargets = new Set<THREE.Object3D>();
export const spatial = {
  panel: null as THREE.Group | null,
  dragging: null as "left" | "right" | null,
  distance: 1.2,
  offset: new THREE.Vector3(),
  recenter: true,
  hovered: null as THREE.Object3D | null,
  feed: false,
  preview: null as null | {
    colour: string;
    outfit: import("@/lib/deader/cosmetics").Outfit;
    pet: boolean;
  },
  auxiliaryFrame: -1,
};
export function registerUI(
  previous: THREE.Object3D | null,
  next: THREE.Object3D | null,
) {
  if (previous) uiTargets.delete(previous);
  if (next) uiTargets.add(next);
}
export function visibleTarget(o: THREE.Object3D) {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return o.parent !== null;
}
