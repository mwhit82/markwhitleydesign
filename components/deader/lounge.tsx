"use client";
import { UncPortrait } from './unc-portrait';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCharacterWear } from './character-wear';
import { useGame } from '@/lib/deader/store';
import { SEATS, residentPosition, type Resident } from '@/lib/deader/lounge';
import { visitorById } from '@/lib/deader/visitors';
import { Box, Sign } from './environment';
import { Cone } from './character';
import type { RoomMaterials } from './room-materials';
export function Lounge({materials:m}:{materials:RoomMaterials}) {
  const wear=useMemo(createCharacterWear,[]);
  useEffect(()=>()=>{wear.map.dispose();wear.relief.dispose();},[wear]);
  const residents=useGame(s=>s.room.residents), paused=useGame(s=>!!s.panel||!s.focused||!!s.suspension);
  return <group>
    <UncPortrait/>
    <Box position={[0,-.11,7.3]} size={[7.6,.2,7]} material={m.floor}/>
    <Box position={[0,3.33,7.3]} size={[7.6,.12,7]} material={m.wood}/>
    {[-3.8,3.8].map(x=><Box key={x} position={[x,1.65,7.3]} size={[.2,3.3,7]} material={m.plaster}/>)}
    <Box position={[0,1.65,10.8]} size={[7.6,3.3,.2]} material={m.plaster}/>
    <Sign text="HOLDING LOUNGE" rotation={[0,Math.PI,0]} position={[0,2.65,3.65]} width={1.8} height={.3}/>
    <Box position={[3.3,1.1,10.65]} size={[.8,2.2,.08]} material={m.wood}/>
    <Sign text="EXIT" rotation={[0,Math.PI,0]} position={[3.3,2.4,10.58]} width={.5} height={.2}/>
    <pointLight position={[0,2.9,7]} intensity={10} distance={8} color="#e3b47b" castShadow={false}/>
    {SEATS.map((p,i)=><group key={i} position={[p.x,0,p.z]}>
      <Box position={[0,.48,0]} size={[.8,.15,.65]} material={m.wood}/>
      <Box position={[0,.85,-.3]} size={[.8,.75,.12]} material={m.wood}/>
      {[-.3,.3].map(x=><Box key={x} position={[x,.22,0]} size={[.07,.44,.5]} material={m.metal}/>)}
    </group>)}
    {residents.map(r=><LoungeResident key={r.id} resident={r} paused={paused} wear={wear}/>)}
  </group>;
}

function LoungeResident({resident:r,paused,wear}:{resident:Resident;paused:boolean;wear:ReturnType<typeof createCharacterWear>}){
  const group=useRef<THREE.Group>(null),v=visitorById(r.visitor);
  const initial=useRef(residentPosition(r)).current;
  useFrame((_,dt)=>{if(!group.current||paused)return;const p=residentPosition(r);const dx=p.x-group.current.position.x,dz=p.z-group.current.position.z;
    if(r.phase!=="seated"&&Math.hypot(dx,dz)>.01)group.current.rotation.y=Math.atan2(dx,dz);
    if(r.phase==="seated")group.current.rotation.y=0;
    group.current.position.lerp(new THREE.Vector3(p.x,p.y,p.z),1-Math.exp(-dt*18));});
  return <group ref={group} userData={{shotTarget:r.id}} visible={r.phase!=="entering"||r.elapsed>0} position={[initial.x,initial.y,initial.z]}><Cone colour={v.colour} appearance={v.appearance} seated={r.phase==='seated'} walking={r.phase!=='seated'} paused={paused} wearTexture={wear} lowDetail/></group>;
}
