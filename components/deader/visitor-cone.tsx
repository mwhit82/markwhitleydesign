"use client";
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Cone } from './character';
import { anomalyTell, type VisitorDefinition } from '@/lib/deader/visitors';
import { useGame } from '@/lib/deader/store';
import { roomAudio } from '@/lib/deader/audio/room-audio';
import { roomPlayerPose } from './player-reflection';
import type { ComponentProps } from 'react';
export function VisitorCone({visitor,seconds=0,mimicStage=0,attack=false,...props}:{visitor:VisitorDefinition;seconds?:number;mimicStage?:number;attack?:boolean}&Omit<ComponentProps<typeof Cone>,'appearance'|'colour'>){
 const played=useRef(false);
 const fragments=useRef<THREE.Group>(null), root=useRef<THREE.Group>(null);
 const reduced=useGame(s=>s.save.settings.reducedMotion),effects=useGame(s=>s.save.settings.effects);
 const tell=anomalyTell(seconds,visitor.name.length,reduced || (typeof window!=="undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
 useEffect(()=>{
  if(!attack||played.current)return;played.current=true;
  const position=root.current?.getWorldPosition(new THREE.Vector3());
  if(position)roomAudio.scream(position.x,position.z,roomPlayerPose);
 },[attack]);
 useFrame(()=>{
  if(visitor.appearance==='kids'&&root.current&&!props.paused)root.current.rotation.z=reduced?0:Math.sin(seconds*1.7)*.025;
  if(!fragments.current)return;
  fragments.current.children.forEach((o,i)=>{
   o.position.set(-.46+Math.sin(seconds*(reduced?0:18)+i*3)*.14,.45+(i%5)*.06,Math.cos(i*5+seconds*(reduced?0:12))*.1);
  });
 });
 return <group ref={root} scale={visitor.appearance==='kids'?[1.10,1.12,1]:1}>
  <Cone {...props} colour={visitor.colour} appearance={visitor.appearance} split={visitor.appearance==='splitter'?tell:0} glitch={visitor.appearance==='glitched'?tell:0}/>
  {visitor.appearance==='glitched'&&<group ref={fragments} visible={tell>0}>{Array.from({length:effects?18:6},(_,i)=><mesh key={i}><boxGeometry args={[.045,.045,.045]}/><meshStandardMaterial color={i%5===0?'#b4e4ea':'#111111'} emissive={i%5===0?'#234449':'#000000'}/></mesh>)}</group>}
  {visitor.appearance==='kids'&&<group>
   {[-1,1].map((x)=><mesh key={x} position={[x*.38,.78+x*.12,.12]} rotation={[0,0,x*.8]}><capsuleGeometry args={[.055,.32,3,8]}/><meshStandardMaterial color="#171512"/></mesh>)}
   <mesh position={[0,.84,.30]}><planeGeometry args={[.28,.28,6,6]}/><meshStandardMaterial color="#4e4524" wireframe/></mesh>
   <mesh position={[0,.22,.03]}><coneGeometry args={[.23,.28,16]}/><meshStandardMaterial color={visitor.colour}/></mesh>
  </group>}
  {mimicStage>0&&<group>
   {(mimicStage===1?[-.13]:[-.13,.13]).map(x=><group key={x} position={[x,.99,.265]}>
    {mimicStage>=3&&<mesh scale={[1,1.35,.3]}><sphereGeometry args={[.10,12,8]}/><meshStandardMaterial color="#060606"/></mesh>}
    <mesh position={[0,0,.025]} scale={[1,1,.4]}><sphereGeometry args={[mimicStage===1?.012:.026,10,6]}/><meshStandardMaterial color="#df1e32" emissive="#6b0910"/></mesh>
   </group>)}
   {mimicStage>=3&&<group position={[0,.65,.36]}>
    <mesh scale={[1,1.7,.25]}><sphereGeometry args={[.16,14,10]}/><meshStandardMaterial color="#050505"/></mesh>
    {[-.13,0,.13].map((y,i)=><group key={y} position={[i%2?.045:-.035,y,.05]} rotation={[0,0,.3*(i-1)]}><mesh scale={[1.4,.7,.4]}><sphereGeometry args={[.039,10,6]}/><meshStandardMaterial color="#e4e0cc"/></mesh><mesh position={[0,0,.02]}><sphereGeometry args={[.014,8,6]}/><meshStandardMaterial color="#bd1726"/></mesh></group>)}
   </group>}
  </group>}
 </group>;
}
