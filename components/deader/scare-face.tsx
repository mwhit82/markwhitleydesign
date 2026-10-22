"use client";
import {useVR} from "@/lib/deader/vr-state";
import { useEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { closeScarePose } from '@/lib/deader/presentation';
import { createCharacterWear } from './character-wear';
import { currentReveal, JUDGEMENT_INTRO_SECONDS, dawnScarePose } from '@/lib/deader/judgement';
import { visitorById } from '@/lib/deader/visitors';
/** Camera-relative original cone face: no extra renderer, overlays or postprocessing. */
export function ScareFace(){
  const group=useRef<THREE.Group>(null), reduced=useRef(false);
  const visitor=useGame(s=>s.room.encounters.active?.visitor);
  useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{reduced.current=q.matches;};update();q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
  useFrame(({camera})=>{
    if(!group.current)return;
    const s=useGame.getState(),seq=s.room.survival;
    group.current.visible=seq.phase==='lunge'&&seq.kind==='anomaly';
    if(!group.current.visible)return;
    const pose=closeScarePose(seq.elapsed,s.save.settings.gentleScares,reduced.current||s.save.settings.reducedMotion);
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.translateZ(-pose.distance);
    // Face fills the narrower phone view too, without relying on world-space visitor height.
    group.current.scale.setScalar(pose.scale);
    group.current.rotateZ(pose.roll);
  });
  const v=visitor?visitorById(visitor):null;
  return <group ref={group} visible={false} renderOrder={100}>
    <mesh renderOrder={101}><coneGeometry args={[.75,1.5,20]}/><meshBasicMaterial color={v?.colour??'#b8a151'} depthTest={false}/></mesh>
    {[-.24,.24].map(x=><group key={x} renderOrder={100} position={[x,.08,.43]}>
      <mesh renderOrder={102} scale={[1,1.7,1]}><sphereGeometry args={[.14,12,8]}/><meshBasicMaterial color="#080707" depthTest={false}/></mesh>
      <mesh renderOrder={103} position={[0,0,.13]}><sphereGeometry args={[.035,8,6]}/><meshBasicMaterial color="#e7dfd1" depthTest={false}/></mesh>
    </group>)}
    {v?.appearance==='third-eye'&&<mesh renderOrder={103} position={[0,.36,.3]}><sphereGeometry args={[.09,10,8]}/><meshBasicMaterial color="#120b0b" depthTest={false}/></mesh>}
    <mesh renderOrder={104} position={[0,-.37,.6]} scale={[1,1.65,.3]}><sphereGeometry args={[.25,16,12]}/><meshBasicMaterial color="#050303" depthTest={false}/></mesh>
    {[-.14,-.07,0,.07,.14].map(x=><mesh renderOrder={105} key={x} position={[x,-.17,.68]} rotation={[0,0,Math.PI]}><coneGeometry args={[.035,.14,3]}/><meshBasicMaterial color="#c8c0aa" depthTest={false}/></mesh>)}
  </group>;
}

/** Dawn-only monster; camera-relative transforms never modify player aim. */
export function DawnFace(){
 const vr=useVR(s=>s.active);const {scene:world}=useThree();const anchor=useRef<{p:THREE.Vector3;q:THREE.Quaternion}|null>(null);
 const ref=useRef<THREE.Group>(null);
 const overlay=useMemo(()=>new THREE.Scene(),[]);
 const wear=useMemo(createCharacterWear,[]);
 useEffect(()=>()=>{wear.map.dispose();wear.relief.dispose();},[wear]);
 useFrame(({camera})=>{
  if(!ref.current)return;
  const s=useGame.getState(),j=s.room.judgement;
  if(!j){ref.current.visible=false;anchor.current=null;return;}
  const entry=currentReveal(j);
  const active=!!entry&&!entry.shot&&entry.profile.kind==="anomaly";
  const pose=dawnScarePose(j.entries ? (active?JUDGEMENT_INTRO_SECONDS+j.elapsed%3:0) : j.elapsed,s.save.settings.gentleScares,s.save.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches);
  ref.current.visible=pose.active;
  if(vr){
   if(!pose.active)anchor.current=null;
   if(pose.active&&!anchor.current)anchor.current={p:camera.getWorldPosition(new THREE.Vector3()),q:camera.getWorldQuaternion(new THREE.Quaternion())};
   if(anchor.current){ref.current.position.copy(anchor.current.p);ref.current.quaternion.copy(anchor.current.q);ref.current.translateZ(-1.15);ref.current.translateX(pose.x*.5);ref.current.translateY(pose.y*.5);ref.current.rotateZ(pose.roll*.5);}
  }else{ref.current.position.copy(camera.position);ref.current.quaternion.copy(camera.quaternion);ref.current.translateZ(-pose.distance);ref.current.translateX(pose.x);ref.current.translateY(pose.y+.1);ref.current.rotateZ(pose.roll);}
  const aspect=camera instanceof THREE.PerspectiveCamera?camera.aspect:1;
  ref.current.scale.setScalar(Math.min(.58,Math.max(.42,aspect*.62)));
 });
 useFrame(({gl,scene,camera})=>{
  gl.render(scene,camera);
  if(!vr&&ref.current?.visible){const auto=gl.autoClear;gl.autoClear=false;gl.clearDepth();try{gl.render(overlay,camera);}finally{gl.autoClear=auto;}}
 },1);
 return createPortal(<group ref={ref} visible={false} userData={{ignoreBullet:true}}>
  <pointLight position={[-1.3,1.5,2.8]} color="#ffe2bb" intensity={12} distance={6}/>
  <pointLight position={[1,-.2,1.4]} color="#ad1926" intensity={3} distance={4}/>
  <ambientLight intensity={.3}/>

  <mesh><coneGeometry args={[.78,1.75,28]}/><meshStandardMaterial color="#b8a53b" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*.27,.13,.48]} rotation={[0,0,side*-.14]}>
   <mesh scale={[1,1.15,.8]}><sphereGeometry args={[.25,20,12]}/><meshStandardMaterial color="#211517" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>
   <mesh position={[-side*.025,-.015,.225]} scale={[1,1.2,.25]}><sphereGeometry args={[.105,16,10]}/><meshStandardMaterial color="#a1141c" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>
   <mesh position={[-side*.025,-.015,.26]} scale={[.4,1,.25]}><sphereGeometry args={[.05,12,8]}/><meshStandardMaterial color="#170307" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>
  </group>)}
  <mesh position={[0,-.32,.54]} scale={[1,1.45,.18]}><sphereGeometry args={[.30,20,16]}/><meshStandardMaterial color="#050405" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>
  {[-.19,-.065,.075,.2].map((x,i)=><mesh key={x} position={[x,-.19,.66]} rotation={[0,0,Math.PI+(i-1.5)*.09]}><coneGeometry args={[.065,.24+(i%2)*.08,5]}/><meshStandardMaterial color="#ded6b8" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>)}
  {[-.16,0,.17].map(x=><mesh key={x} position={[x,-.61,.65]} rotation={[0,0,-x]}><coneGeometry args={[.05,.17,5]}/><meshStandardMaterial color="#c0b89c" map={wear.map} bumpMap={wear.relief} bumpScale={.018} roughness={.6}/></mesh>)}
  <mesh position={[0,-.32,.64]} scale={[1,1.45,1]}><torusGeometry args={[.29,.035,10,32]}/><meshStandardMaterial color="#761c26" map={wear.map} bumpMap={wear.relief} bumpScale={.015} roughness={.24}/></mesh>
  {[-.22,.13,.26].map((x,i)=><group key={x} position={[x,-.52,.65]}>
   <mesh position={[0,-.12-i*.025,0]} rotation={[0,0,x*.4]}><capsuleGeometry args={[.014,.2+i*.05,4,8]}/><meshStandardMaterial color="#780d19" roughness={.17}/></mesh>
   <mesh position={[.012,-.25-i*.025,0]} scale={[.7,1.8,.6]}><sphereGeometry args={[.025,10,8]}/><meshStandardMaterial color="#8f1520" roughness={.15}/></mesh>
  </group>)}
 </group>,vr?world:overlay);
}
