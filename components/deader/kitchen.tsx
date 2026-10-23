"use client";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { Box, Sign } from './environment';
import type { RoomMaterials } from './room-materials';
export function KitchenRoom({materials:m}:{materials:RoomMaterials}) {
 const paused=useGame(s=>!!s.panel||!s.focused||!!s.suspension);
 const k=useGame(s=>s.room.kitchen),effects=useGame(s=>s.save.settings.effects);
 const cloud=useRef<THREE.Group>(null);
 useFrame(({clock})=>{if(cloud.current&&!paused)cloud.current.rotation.y=effects?Math.sin(clock.elapsedTime*.6)*.15:0;});
 const smoke=k.seconds>=45||k.failure==='fire';
 return <group>
  <Box position={[6,-.11,7.3]} size={[4.6,.2,5.8]} material={m.floor}/>
  <Box position={[6,3.33,7.3]} size={[4.6,.12,5.8]} material={m.wood}/>
  <Box position={[8.4,1.65,7.3]} size={[.2,3.3,5.8]} material={m.plaster}/>
  {[4.4,10.2].map(z=><Box key={z} position={[6.1,1.65,z]} size={[4.6,3.3,.2]} material={m.plaster}/>)}
  <Sign text="KITCHEN" position={[3.64,2.6,7.2]} rotation={[0,-Math.PI/2,0]} width={1.4} height={.3}/>
  <pointLight position={[6,2.8,7.3]} intensity={12} distance={7} color={k.failure==='fire'?'#ff751b':'#e6c393'}/>
  <Box position={[6,3.1,7.3]} size={[1,.08,.4]} colour="#d4c6a3"/>
  <group position={[7.65,0,6]} rotation={[0,-Math.PI/2,0]} userData={{interaction:'Fridge',vrAim:[0,1.4,.5]}}>
   <Box position={[0,1,0]} size={[1.2,2,.95]} material={m.metal}/>
   <Box position={[0,1.42,.49]} size={[1.1,.95,.05]} colour="#a5afa7"/>
   <Box position={[0,.48,.49]} size={[1.1,.85,.05]} colour="#919d96"/>
   <Box position={[.43,1.1,.57]} size={[.06,.48,.09]} material={m.wood}/>
   <Sign text="FRIDGE" position={[0,1.7,.53]} width={.75} height={.2}/>
  </group>
  <group position={[7.65,0,8]} rotation={[0,-Math.PI/2,0]} userData={{interaction:'Oven',vrAim:[0,.8,.5]}}>
   <Box position={[0,.55,0]} size={[1.15,1.1,1]} material={m.metal}/>
   <Box position={[0,.52,.52]} size={[.95,.65,.05]} colour={k.oven==='off'?'#141719':'#5d2911'}/>
   <Box position={[0,.85,.6]} size={[.8,.06,.08]} material={m.wood}/>
   {[-.36,-.12,.12,.36].map(x=><mesh key={x} position={[x,1,.54]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.05,.05,.06,10]}/><meshStandardMaterial color="#292c2e"/></mesh>)}
   {[-.28,.28].flatMap(x=>[-.23,.23].map(z=><mesh key={`${x}:${z}`} position={[x,1.11,z]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.16,.025,6,16]}/><meshStandardMaterial color="#242323" roughness={.7}/></mesh>))}
   <Sign text="OVEN" position={[0,1.4,.1]} width={.8} height={.22}/>
  </group>
  {smoke&&<group ref={cloud} position={[7.5,1.3,8]}>{Array.from({length:effects?6:2},(_,i)=><mesh key={i} position={[Math.sin(i)*.25,i*.28,Math.cos(i)*.2]} scale={.3+i*.08}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial color={k.failure==='fire'&&i<2?'#ff962f':'#56524d'} transparent opacity={.55} depthWrite={false}/></mesh>)}</group>}
 </group>;
}
