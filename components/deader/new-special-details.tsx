"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Outfit } from "@/lib/deader/cosmetics";
import { useGame } from "@/lib/deader/store";
export function NewSpecialDetails({outfit,wear,paused}:{outfit?:Outfit;wear:{map:THREE.Texture;relief:THREE.Texture};paused:boolean}){
 const moths=useRef<THREE.Group>(null), lenses=useRef<THREE.Group>(null),time=useRef(0);
 useFrame((_,dt)=>{
  const s=useGame.getState(),reduced=s.save.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!paused&&s.focused)time.current+=Math.min(dt,.05);
  if(moths.current){moths.current.visible=s.save.settings.effects&&!reduced;moths.current.children.forEach((m,i)=>{const t=time.current*.7+i;m.position.set(Math.sin(t)*.6,.7+Math.sin(t*1.4)*.35,Math.cos(t)*.5);m.rotation.set(0,-t,Math.sin(t*4)*.25);});}
  if(lenses.current)lenses.current.children.forEach((m,i)=>{m.position.y=(i-1)*.035+(reduced||!s.save.settings.effects?0:Math.sin(time.current*2+i)*.012);});
 });
 const material={map:wear.map,bumpMap:wear.relief,bumpScale:.004,roughness:.7};
 return <group>
 {outfit?.hat==='bent-halo'&&<mesh position={[0,1.65,0]} rotation={[1.4,.18,.22]} scale={[1,.82,1]}><torusGeometry args={[.25,.025,8,24]}/><meshStandardMaterial {...material} color="#a09060" metalness={.5}/></mesh>}
 {outfit?.hat==='midnight-crown'&&<group position={[0,1.39,0]}><mesh><cylinderGeometry args={[.18,.23,.15,8,1,true]}/><meshStandardMaterial {...material} color="#24282e" side={THREE.DoubleSide}/></mesh>{Array.from({length:6},(_,i)=><group key={i} position={[Math.sin(i*Math.PI/3)*.17,.13,Math.cos(i*Math.PI/3)*.17]}><mesh><coneGeometry args={[.065,.22,4]}/><meshStandardMaterial {...material} color="#24282e"/></mesh><mesh position={[0,-.05,.015]}><sphereGeometry args={[.025,8,6]}/><meshStandardMaterial color="#ba8540"/></mesh></group>)}</group>}
 {outfit?.glasses==='static-specs'&&<group position={[0,.99,.27]} rotation={[-.33,0,0]}>{[-.13,.13].map(x=><group key={x} position={[x,0,0]}><mesh><boxGeometry args={[.21,.17,.035]}/><meshStandardMaterial {...material} color="#27292b"/></mesh><group ref={x<0?lenses:undefined}>{[-1,0,1].map(i=><mesh key={i} position={[0,i*.035,.022]}><boxGeometry args={[.16,.012,.005]}/><meshStandardMaterial color="#84959b" emissive="#263136" emissiveIntensity={.2}/></mesh>)}</group></group>)}<mesh><boxGeometry args={[.08,.025,.03]}/><meshStandardMaterial color="#27292b"/></mesh></group>}
 {outfit?.face==='moon-patch'&&<group position={[-.13,1,.27]} rotation={[-.33,0,-.3]}><mesh><circleGeometry args={[.085,16]}/><meshStandardMaterial {...material} color="#34333a" side={THREE.DoubleSide}/></mesh><mesh position={[.005,0,.005]}><torusGeometry args={[.045,.014,6,14,Math.PI*1.4]}/><meshStandardMaterial color="#d1c8a1"/></mesh></group>}
 {outfit?.backpack==='lost-signal-pack'&&<group position={[0,.71,-.35]}><mesh><boxGeometry args={[.5,.55,.22]}/><meshStandardMaterial {...material} color="#454a42"/></mesh><mesh position={[.16,.47,0]} rotation={[0,0,-.22]}><cylinderGeometry args={[.008,.012,.5,6]}/><meshStandardMaterial color="#9c9787"/></mesh>{[-1,0,1].map(i=><mesh key={i} position={[0,i*.08,-.12]}><boxGeometry args={[.33,.025,.02]}/><meshStandardMaterial color="#1c201d"/></mesh>)}</group>}
 {outfit?.hand==='pocket-moon'&&<group position={[.56,.55,.08]}><mesh><sphereGeometry args={[.16,16,12]}/><meshStandardMaterial {...material} color="#d4d1bc"/></mesh>{[0,1,2].map(i=><mesh key={i} position={[-.08+i*.07,.05-i*.04,.14]} scale={[1,.65,.18]}><sphereGeometry args={[.025,8,6]}/><meshStandardMaterial color="#858373"/></mesh>)}</group>}
 {outfit?.effect==='shadow-moths'&&<group ref={moths}>{Array.from({length:6},(_,i)=><group key={i}>{[-1,1].map(side=><mesh key={side} position={[side*.025,0,0]} rotation={[0,side*.4,side*.3]} scale={[1,.6,.12]}><sphereGeometry args={[.035,6,4]}/><meshStandardMaterial color={i%2?'#514c5a':'#27262e'}/></mesh>)}</group>)}</group>}
 </group>;
}
export function porcelainTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
 c.fillStyle='#dedad0';c.fillRect(0,0,256,256);c.strokeStyle='#625e57';c.lineWidth=1;
 for(let i=0;i<18;i++){let x=(i*79)%256,y=(i*43)%256;c.beginPath();c.moveTo(x,y);for(let k=0;k<5;k++){x+=Math.sin(i*9+k*3)*18;y+=12;c.lineTo(x,y);}c.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
