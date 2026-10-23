import type { Camera, Scene, WebGLRenderer } from 'three';
/** Render the independent preview with normal material depth, over the base frame. */
export function renderVRPreview(gl:Pick<WebGLRenderer,'autoClear'|'clearDepth'|'render'>,scene:Scene,camera:Camera) {
 const autoClear=gl.autoClear;
 gl.autoClear=false;
 try {gl.clearDepth();gl.render(scene,camera);} finally {gl.autoClear=autoClear;}
}
export const grabBarColour=(hovered:boolean,dragging:boolean)=>hovered||dragging?'#fff9e8':'#aca89a';
