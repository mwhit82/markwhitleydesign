import * as THREE from "three";

export const VR_FEED_WIDTH = 384;
export const VR_FEED_HEIGHT = 216;
export const VR_FEED_INTERVAL = 1 / 5;
export const feedHealth = { failed: false, rendering: false };
export function retryVRFeed() {
  feedHealth.failed = false;
}

/** Isolate an auxiliary render from the headset framebuffer and all other feeds. */
export function renderVRFeed(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget,
): boolean {
  if (feedHealth.failed || feedHealth.rendering) return false;
  feedHealth.rendering = true;
  const old = {
    target: gl.getRenderTarget(),
    face: gl.getActiveCubeFace(),
    mip: gl.getActiveMipmapLevel(),
    viewport: gl.getViewport(new THREE.Vector4()),
    scissor: gl.getScissor(new THREE.Vector4()),
    scissorTest: gl.getScissorTest(),
    xr: gl.xr.enabled,
    auto: gl.autoClear,
    shadow: gl.shadowMap.autoUpdate,
  };
  const hidden: THREE.Object3D[] = [];
  try {
    scene.traverse((o) => {
      if (
        o.visible &&
        (o.userData.vrUI ||
          o.userData.vrHand ||
          o.userData.firstPersonWeapon ||
          o.userData.auxiliarySurface)
      ) {
        hidden.push(o);
        o.visible = false;
      }
    });
    gl.xr.enabled = false;
    gl.autoClear = true;
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(target);
    gl.setScissorTest(false);
    gl.clear();
    gl.render(scene, camera);
    return true;
  } catch (error) {
    feedHealth.failed = true;
    console.error("VR camera feed stopped; close or retry the camera.", error);
    return false;
  } finally {
    try {
      gl.xr.enabled = old.xr;
      gl.autoClear = old.auto;
      gl.shadowMap.autoUpdate = old.shadow;
      // Restore logical canvas state first; binding the old target then restores
      // its framebuffer viewport (including the XR compositor's pixel viewport).
      gl.setViewport(old.viewport);
      gl.setScissor(old.scissor);
      gl.setScissorTest(old.scissorTest);
      gl.setRenderTarget(old.target, old.face, old.mip);
    } finally {
      hidden.forEach((o) => {
        o.visible = true;
      });
      feedHealth.rendering = false;
    }
  }
}
