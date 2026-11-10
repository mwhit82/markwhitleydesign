"use client";
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import type {Photograph} from '@/data/photography';
import type {PhotoMotionValue} from './photo-motion';
export function PhotoDepthCanvas({depth,motion}:{depth:NonNullable<Photograph['depth']>;motion:PhotoMotionValue}){
 const element=useRef<HTMLCanvasElement>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{
  const canvas=element.current;if(!canvas)return;let disposed=false;
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),geometry=new THREE.PlaneGeometry(2,2);
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{photo:{value:null},depthMap:{value:null},shift:{value:new THREE.Vector2()},strength:{value:depth.strength}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D photo;uniform sampler2D depthMap;uniform vec2 shift;uniform float strength;varying vec2 vUv;
void main(){vec2 base=(vUv-.5)/1.06+.5;vec2 uv=base;for(int i=0;i<3;i++){float d=texture2D(depthMap,uv).r;uv=base+shift*strength*(d-.5)+shift*.005;}gl_FragColor=texture2D(photo,clamp(uv,vec2(.001),vec2(.999)));
#include <colorspace_fragment>
}`});
  scene.add(new THREE.Mesh(geometry,material));const textures:THREE.Texture[]=[];
  const draw=()=>{if(disposed||!material.uniforms.photo.value||!motion.active)return;material.uniforms.shift.value.set(motion.x,-motion.y);try{renderer.render(scene,camera);}catch{setReady(false);}};
  const size=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);draw();};
  const observer=new ResizeObserver(size);observer.observe(canvas);size();
  const contextLost=(event:Event)=>{event.preventDefault();setReady(false);};canvas.addEventListener('webglcontextlost',contextLost);
  const loader=new THREE.TextureLoader();
  Promise.all([loader.loadAsync(depth.imageSrc),loader.loadAsync(depth.src)]).then(([photo,map])=>{
   if(disposed){photo.dispose();map.dispose();return;}
   textures.push(photo,map);photo.colorSpace=THREE.SRGBColorSpace;map.colorSpace=THREE.NoColorSpace;photo.minFilter=THREE.LinearFilter;map.minFilter=THREE.LinearFilter;photo.generateMipmaps=false;map.generateMipmaps=false;
   material.uniforms.photo.value=photo;material.uniforms.depthMap.value=map;motion.onFrame=draw;draw();setReady(true);motion.wake?.();
  }).catch(()=>{if(!disposed)setReady(false);});
  return()=>{disposed=true;if(motion.onFrame===draw)motion.onFrame=undefined;observer.disconnect();canvas.removeEventListener('webglcontextlost',contextLost);textures.forEach(texture=>texture.dispose());material.dispose();geometry.dispose();renderer.dispose();renderer.forceContextLoss();};
 },[depth,motion]);
 return <canvas ref={element} className="photoDepthCanvas" style={{opacity:ready?1:0}} aria-hidden="true"/>;
}
