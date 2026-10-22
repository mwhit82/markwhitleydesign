"use client";
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Outfit} from '@/lib/deader/cosmetics';
import {useGame} from '@/lib/deader/store';
const rainbow=['#ed2929','#f68922','#f1d72a','#46ba35','#25bfcf','#7539b9'];
export function BundleDetails({outfit,paused=false}:{outfit?:Outfit;paused?:boolean}){
 const bits=useRef<THREE.Group>(null),eye=useRef<THREE.Group>(null),time=useRef(0);
 const settings=useGame(s=>s.save.settings);
 useFrame((_,dt)=>{
  if(paused||!useGame.getState().focused)return;time.current+=Math.min(.05,dt);
  const reduced=settings.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(eye.current)eye.current.rotation.z=reduced?0:Math.sin(time.current*2.4)*.13;
  if(bits.current){bits.current.visible=settings.effects&&!reduced;bits.current.children.forEach((b,i)=>{const t=(time.current*.3+i/12)%1;b.position.set(Math.sin(i*7)*(.4+t*.2),1.4-t*1.3,Math.cos(i*9)*.45);b.rotation.set(t*5,i,t*7);});}
 });
 if(!outfit)return null;
 return <group>
 {outfit.hat==='rainbow-hat'&&<group position={[0,1.38,0]}>{rainbow.map((c,i)=><mesh key={c} position={[0,.06+i*.065,0]}><cylinderGeometry args={[.21-(i+1)*.032,.21-i*.032,.065,16]}/><meshStandardMaterial color={c} roughness={.65}/></mesh>)}</group>}
 {outfit.hand==='cake'&&<group position={[.57,.55,.08]}>
  <mesh><cylinderGeometry args={[.17,.17,.19,16]}/><meshStandardMaterial color="#edab95"/></mesh><mesh position={[0,.1,0]}><cylinderGeometry args={[.18,.18,.035,16]}/><meshStandardMaterial color="#eee6d5"/></mesh>
  <mesh position={[0,.18,0]}><cylinderGeometry args={[.012,.012,.14,6]}/><meshStandardMaterial color="#734f3a"/></mesh><mesh position={[0,.27,0]}><sphereGeometry args={[.028,8,6]}/><meshStandardMaterial color="#ffbb25" emissive="#9c4310"/></mesh>
 </group>}
 {outfit.wrap==='bandages'&&<group>{[0,1,2].map(i=><mesh key={i} position={[.23,.08+i*.045,.01]} rotation={[0,0,.18]}><cylinderGeometry args={[.052,.052,.028,10]}/><meshStandardMaterial color="#ddd8c6" roughness={1}/></mesh>)}<mesh position={[-.25,1.0,.18]} rotation={[0,0,-.4]}><boxGeometry args={[.18,.055,.055]}/><meshStandardMaterial color="#ddd8c6"/></mesh></group>}
 {outfit.face==='dangling-eye'&&<group ref={eye} position={[.13,.99,.27]}><mesh position={[.025,-.10,.025]} rotation={[0,0,.2]}><cylinderGeometry args={[.007,.007,.20,6]}/><meshStandardMaterial color="#5b3a28"/></mesh><mesh position={[.045,-.22,.04]}><sphereGeometry args={[.055,12,8]}/><meshStandardMaterial color="#151310"/></mesh></group>}
 {outfit.effect&&outfit.effect!=="glitch-particles"&&outfit.effect!=="shadow-moths"&&<group ref={bits}>{Array.from({length:12},(_,i)=><mesh key={i}><boxGeometry args={[.025,.035,.012]}/><meshStandardMaterial color={outfit.effect==='confetti'?rainbow[i%6]:'#bc8c32'}/></mesh>)}</group>}
 </group>;
}
export function rainbowTexture(){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;const c=canvas.getContext('2d')!;for(let i=0;i<12;i++){c.fillStyle=rainbow[i%6];c.fillRect(0,i*128/12,64,128/12+1);}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
