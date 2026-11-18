import {Quaternion, Euler, OrthographicCamera, Scene, WebGLRenderer, Mesh, Texture, type Material} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {neutral, pointerGaze, scrollGaze, swipeTravel, smoothGaze, settled, scrollFadeEndMs, radians} from '@/lib/portrait/gaze';

export type Pose = 'Live' | 'Neutral' | 'Left' | 'Right';

export async function mount(canvas: HTMLCanvasElement, getPose: () => Pose, signal: AbortSignal, failed: () => void) {
  const response = await fetch('/portfolio/avatars/clay-head-study.glb', {signal});
  if (!response.ok) throw new Error('Model unavailable');
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
  const model = gltf.scene;
  function releaseModel() {
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    model.traverse(part => {
      if (part instanceof Mesh) {
        part.geometry.dispose();
        for (const mat of [part.material].flat()) materials.add(mat);
      }
    });
    for (const material of materials) {
      for (const property of Object.values(material)) if (property instanceof Texture) textures.add(property);
      material.dispose();
    }
    for (const texture of textures) {
      const image = texture.source.data;
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close();
      texture.dispose();
    }
  }
  const head = model.getObjectByName('Head');
  const left = model.getObjectByName('EyeLeft');
  const right = model.getObjectByName('EyeRight');
  if (signal.aborted || !head || !left || !right) { releaseModel(); throw new Error('Model unavailable'); }
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'}); }
  catch (error) { releaseModel(); throw error; }
  const scene = new Scene();
  scene.add(model);
  const camera = new OrthographicCamera(-1.1,1.1,1.1,-1.1,0.1,20);
  camera.position.set(0,1,6);
  camera.lookAt(0,1,0);
  const parts = [head,left,right];
  const rests = parts.map(part => part.quaternion.clone());
  const rotation = new Quaternion();
  const euler = new Euler(0,0,0,'YXZ');
  let current = neutral;
  let point: {x:number;y:number} | undefined;
  let touch = !matchMedia('(hover:hover) and (pointer:fine)').matches;
  let scrollY = window.scrollY, lastScroll = 0, travel = 0;
  let visible = true, lost = false, frame = 0, previous = 0;
  function target(now: number) {
    const pose = getPose();
    if (pose === 'Neutral') return neutral;
    if (pose !== 'Live') {
      const side = pose === 'Left' ? -1 : 1;
      return {...neutral, yaw:side*radians(15), eyeX:side*7};
    }
    if (touch) return scrollGaze(travel,now-lastScroll);
    if (!point) return neutral;
    const rect = canvas.getBoundingClientRect();
    return pointerGaze(point.x,point.y,rect.left+rect.width/2,rect.top+rect.height*.376,rect.width,rect.height);
  }
  const blocked = () => lost || signal.aborted || !visible || document.hidden || !!document.querySelector('dialog[open]');
  function render(now: number) {
    frame = 0;
    if (blocked()) return;
    const desired = target(now);
    current = smoothGaze(current,desired,previous ? Math.min(.05,(now-previous)/1000) : 1/60,touch);
    previous = now;
    const done = settled(current,desired);
    if (done) current = desired;
    parts.forEach((part,i) => {
      // On a 30.5 source-pixel eyeball, asin(displacement/radius) preserves the old iris travel.
      euler.set(i ? Math.asin(current.eyeY/30.5) : current.pitch*.6,
                i ? Math.asin(current.eyeX/30.5) : current.yaw*(10/15),0,'YXZ');
      part.quaternion.copy(rests[i]).multiply(rotation.setFromEuler(euler));
    });
    renderer.render(scene,camera);
    if (!done || (getPose()==='Live' && touch && travel && now-lastScroll<scrollFadeEndMs)) frame=requestAnimationFrame(render);
  }
  function refresh() {
    if (!frame && !blocked()) { previous=0; frame=requestAnimationFrame(render); }
  }
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
    refresh();
  }
  function move(e: PointerEvent) {
    if (e.pointerType==='touch') return;
    touch=false; point={x:e.clientX,y:e.clientY}; refresh();
  }
  function down(e: PointerEvent) { if(e.pointerType==='touch'){touch=true; travel=0; point=undefined; refresh();} }
  function leave() {point=undefined; refresh();}
  function scroll() {
    const position=Math.max(0,Math.min(window.scrollY,document.documentElement.scrollHeight-innerHeight));
    const delta=position-scrollY;
    if(Math.abs(delta)>=1){const now=performance.now(); travel=swipeTravel(travel,delta,now-lastScroll); scrollY=position;lastScroll=now;}
    refresh();
  }
  function loss(){lost=true;failed();}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;refresh();});
  const sizes=new ResizeObserver(resize);
  const dialogs=new MutationObserver(refresh);
  observer.observe(canvas);sizes.observe(canvas);
  dialogs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  const events = {signal,passive:true};
  window.addEventListener('pointermove',move,events);
  window.addEventListener('pointerdown',down,events);
  window.addEventListener('scroll',scroll,events);
  document.documentElement.addEventListener('pointerleave',leave,events);
  document.addEventListener('visibilitychange',refresh,events);
  canvas.addEventListener('webglcontextlost',loss,events);
  resize();
  return {refresh,dispose(){
    cancelAnimationFrame(frame);observer.disconnect();sizes.disconnect();dialogs.disconnect();
    releaseModel();renderer.dispose();
  }};
}
