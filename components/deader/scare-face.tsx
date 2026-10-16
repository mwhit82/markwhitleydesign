"use client";
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { closeScarePose } from '@/lib/deader/presentation';
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
