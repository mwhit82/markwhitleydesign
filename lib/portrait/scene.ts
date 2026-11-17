import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {neutral, pointerGaze, scrollGaze, smoothGaze, settled, type Gaze} from './gaze';

export async function mountPortrait(canvas: HTMLCanvasElement, host: HTMLElement, onReady: () => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, .1, 20);
  camera.position.set(0, 1, 6);
  camera.lookAt(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8bfb5, 2));
  const key = new THREE.DirectionalLight(0xfff7ef, 3); key.position.set(-3, 5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8efff, 1.2); fill.position.set(3, 2, 3); scene.add(fill);
  let model: THREE.Object3D;
  try {
    const response = await fetch('/portfolio/avatars/mark-clay.glb', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Portrait unavailable');
    model = (await new GLTFLoader().parseAsync(await response.arrayBuffer(), '/portfolio/avatars/')).scene;
  } catch (error) {renderer.dispose(); throw error;}
  scene.add(model);
  const head = model.getObjectByName('Head'), left = model.getObjectByName('EyeLeft'), right = model.getObjectByName('EyeRight');
  const resources = () => {
    const textures = new Set<THREE.Texture>();
    model.traverse(object => {if (object instanceof THREE.Mesh) {object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => {Object.values(material).forEach(value => {if (value instanceof THREE.Texture) textures.add(value);}); material.dispose();});}});
    textures.forEach(texture => {const source = texture.source?.data;if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();texture.dispose();});
    renderer.dispose();
  };
  if (!head || !left || !right) {resources(); throw new Error('Portrait rig incomplete');}
  const rests = [head, left, right].map(part => part.quaternion.clone());
  const rotation = new THREE.Quaternion();
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, disposed = false, contextLost = false, frame = 0, previous = 0, painted = false;
  let target: Gaze = {...neutral}, current: Gaze = {...neutral};
  let velocity = 0, lastScroll = performance.now(), scrollPosition = window.scrollY;
  let pointer: {x: number; y: number} | null = null;
  const blocked = () => disposed || contextLost || !visible || document.hidden || reduced.matches || !!document.querySelector('dialog[open]');
  const updateTarget = (now: number) => {
    const rect = host.getBoundingClientRect();
    target = fine.matches ? pointer ? pointerGaze(pointer.x, pointer.y, rect.left+rect.width/2, rect.top+rect.height/2, innerWidth, innerHeight) : {...neutral} : scrollGaze(rect.top+rect.height/2, innerHeight, velocity, now-lastScroll);
  };
  const render = (now: number) => {
    frame = 0;
    if (blocked()) return;
    updateTarget(now);
    const dt = previous ? Math.min((now-previous)/1000, .05) : 1/60; previous = now;
    current = smoothGaze(current, target, dt);
    [head, left, right].forEach((part, index) => {rotation.setFromEuler(new THREE.Euler(index ? current.eyePitch : current.pitch, index ? current.eyeYaw : current.yaw, 0, 'YXZ'));part.quaternion.copy(rests[index]).multiply(rotation);});
    renderer.render(scene, camera);
    if (process.env.NODE_ENV === 'development') {
      canvas.dataset.pose = JSON.stringify(current);
      canvas.dataset.frames = String(Number(canvas.dataset.frames || 0)+1);
    }
    if (!painted) {painted = true; onReady();}
    if (!settled(current, target) || (!fine.matches && velocity !== 0 && now-lastScroll < 400)) frame = requestAnimationFrame(render);
  };
  const wake = () => {if (!blocked() && !frame) {previous = 0; frame = requestAnimationFrame(render);}};
  const pause = () => {cancelAnimationFrame(frame);frame = 0;previous = 0;};
  const sync = () => {if (blocked()) pause();else wake();};
  const move = (event: PointerEvent) => {if (!fine.matches || event.pointerType === 'touch') return;pointer = {x:event.clientX,y:event.clientY};wake();};
  const leave = () => {pointer = null;wake();};
  const scroll = () => {
    const now = performance.now();
    const position = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight-innerHeight));
    const delta = position-scrollPosition;
    if (Math.abs(delta) >= 1) {velocity = delta/Math.max(16, now-lastScroll); lastScroll = now;scrollPosition = position;}
    wake();
  };
  const resize = () => {const rect = host.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio, fine.matches ? 1.5 : 1));renderer.setSize(Math.max(1,rect.width), Math.max(1,rect.height), false);wake();};
  const lost = (event: Event) => {event.preventDefault();contextLost = true;pause();onFailure();};
  const observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting;sync();}); observer.observe(host);
  const sizes = new ResizeObserver(resize); sizes.observe(host);
  const dialogs = new MutationObserver(sync); dialogs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  window.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',leave);
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);fine.addEventListener('change',resize);reduced.addEventListener('change',sync);
  canvas.addEventListener('webglcontextlost',lost);resize();
  return () => {disposed = true;pause();observer.disconnect();sizes.disconnect();dialogs.disconnect();window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',sync);fine.removeEventListener('change',resize);reduced.removeEventListener('change',sync);canvas.removeEventListener('webglcontextlost',lost);resources();};
}
