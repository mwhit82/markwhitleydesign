// Three.js reserves layers 1 and 2 for XR eyes. Never use them for private geometry.
export const REFLECTION_LAYER = 8;
export const REFLECTION_MASK = 1 << REFLECTION_LAYER;
export const XR_EYE_MASK = (1 << 1) | (1 << 2);
export function setReflectionOnly(root: {traverse: (visit:(object:{layers:{set:(layer:number)=>void}})=>void)=>void}) {
  root.traverse(object=>object.layers.set(REFLECTION_LAYER));
}
