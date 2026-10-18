"use client";
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { closeScarePose } from '@/lib/deader/presentation';
import { dawnScarePose } from '@/lib/deader/judgement';
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
 const ref=useRef<THREE.Group>(null);
 useFrame(({camera})=>{
  if(!ref.current)return;
  const s=useGame.getState(),j=s.room.judgement;
  if(!j){ref.current.visible=false;return;}
  const pose=dawnScarePose(j.elapsed,s.save.settings.gentleScares,s.save.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches);
  ref.current.visible=pose.active;
  ref.current.position.copy(camera.position);ref.current.quaternion.copy(camera.quaternion);
  ref.current.translateZ(-pose.distance);ref.current.translateX(pose.x);ref.current.translateY(pose.y+.1);ref.current.rotateZ(pose.roll);
  const aspect=camera instanceof THREE.PerspectiveCamera?camera.aspect:1;
  ref.current.scale.setScalar(Math.min(1,Math.max(.52,aspect*.85)));
 });
 return <group ref={ref} visible={false} userData={{ignoreBullet:true}}>
  <mesh renderOrder={101}><coneGeometry args={[.78,1.75,28]}/><meshBasicMaterial color="#b8a53b" depthTest={false} depthWrite={false}/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*.27,.13,.48]} rotation={[0,0,side*-.14]}>
   <mesh renderOrder={102} scale={[1,1.15,.4]}><sphereGeometry args={[.25,20,12]}/><meshBasicMaterial color="#080707" depthTest={false} depthWrite={false}/></mesh>
   <mesh renderOrder={103} position={[-side*.025,-.015,.11]} scale={[1,1.2,.25]}><sphereGeometry args={[.105,16,10]}/><meshBasicMaterial color="#c20d17" depthTest={false} depthWrite={false}/></mesh>
   <mesh renderOrder={104} position={[-side*.025,-.015,.14]} scale={[.4,1,.25]}><sphereGeometry args={[.05,12,8]}/><meshBasicMaterial color="#170307" depthTest={false} depthWrite={false}/></mesh>
  </group>)}
  <mesh renderOrder={104} position={[0,-.32,.54]} scale={[1,1.45,.3]}><sphereGeometry args={[.30,20,16]}/><meshBasicMaterial color="#050405" depthTest={false} depthWrite={false}/></mesh>
  {[-.19,-.065,.075,.2].map((x,i)=><mesh renderOrder={105} key={x} position={[x,-.19,.66]} rotation={[0,0,Math.PI+(i-1.5)*.09]}><coneGeometry args={[.065,.24+(i%2)*.08,5]}/><meshBasicMaterial color="#ded6b8" depthTest={false} depthWrite={false}/></mesh>)}
  {[-.16,0,.17].map(x=><mesh renderOrder={105} key={x} position={[x,-.61,.65]} rotation={[0,0,-x]}><coneGeometry args={[.05,.17,5]}/><meshBasicMaterial color="#c0b89c" depthTest={false} depthWrite={false}/></mesh>)}
 </group>;
}
