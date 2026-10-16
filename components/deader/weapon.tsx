"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { roomAudio } from '@/lib/deader/audio/room-audio';
import { Box, Sign } from './environment';
import styles from './game.module.css';
export function GunModel() {
  return <group>
    <Box position={[0,0,0]} size={[.12,.14,.4]} colour="#373b40"/>
    <Box position={[0,-.13,.1]} size={[.11,.23,.14]} colour="#4a3425" rotation={[-.2,0,0]}/>
    <mesh position={[0,0,-.25]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.045,.045,.22,10]}/><meshStandardMaterial color="#1c2024" metalness={.65} roughness={.35}/></mesh>
  </group>;
}
export function Weapon() {
  const {scene,camera}=useThree();
  const equipped=useGame(s=>s.room.weapon.collected);
  const held=useRef<THREE.Group>(null);
  const ray=useMemo(()=>new THREE.Raycaster(),[]);
  const centre=useMemo(()=>new THREE.Vector2(),[]);
  const offset=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{held.current?.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=false;});},[]);
  useEffect(()=>{
    const fire=()=>{
      const s=useGame.getState();
      if(!s.room.weapon.collected)return;
      scene.updateMatrixWorld(true);
      ray.setFromCamera(centre,camera);ray.far=20;
      const hit=ray.intersectObjects(scene.children,true).find(h=>{
        if(!(h.object instanceof THREE.Mesh))return false;
        let o:THREE.Object3D|null=h.object;
        while(o){if(!o.visible||o.userData.ignoreBullet||o.userData.sidekick)return false;o=o.parent;}
        // Glass, dust, signs and reflection planes must not swallow a shot.
        const m=h.object.material;return !(m instanceof THREE.Material && m.transparent);
      });
      let o:THREE.Object3D|null=hit?.object??null,target:string|null=null;
      while(o){if(o.userData.shotTarget){target=o.userData.shotTarget;break;}o=o.parent;}
      if(s.fireWeapon(target)){roomAudio.unlock();roomAudio.play('shot');}
    };
    window.addEventListener('anomalous-fire',fire);
    return()=>window.removeEventListener('anomalous-fire',fire);
  },[scene,camera,ray,centre]);
  useFrame(({camera})=>{
    if(!held.current)return;
    const s=useGame.getState(),r=s.room;
    held.current.visible=r.weapon.collected&&!s.panel&&!s.suspension&&!r.judgement&&r.view==='explore'&&r.survival.phase==='idle'&&r.night?.status==='running';
    held.current.position.copy(offset.set(.24,-.25,-.55+(r.weapon.cooldown>.3?.04:0)).applyQuaternion(camera.quaternion).add(camera.position));
    held.current.quaternion.copy(camera.quaternion);
  });
  return <>
    <group position={[-3.45,1.15,1.65]} rotation={[0,Math.PI/2,0]}>
      <Box position={[0,-.05,0]} size={[1,.12,.4]} colour="#44382b"/>
      {!equipped&&<group userData={{interaction:'Take gun'}} position={[0,.15,0]} rotation={[0,Math.PI/2,0]}><GunModel/><mesh visible={false} userData={{interactionProxy:true}}><boxGeometry args={[.65,.65,.7]}/><meshBasicMaterial/></mesh></group>}
      <Sign text="SIX SHOTS / CHOOSE WISELY" position={[0,.43,-.14]} width={1} height={.2}/>
    </group>
    <group ref={held} scale={.65} visible={false} userData={{ignoreBullet:true}}><GunModel/></group>
  </>;
}
export function WeaponUI(){
  const s=useGame(),r=s.room;
  if(s.scene!=='room'||s.panel||s.suspension||!s.focused||r.judgement||r.survival.phase!=='idle'||r.night?.status!=='running')return null;
  return <>
    {r.rewardToast&&<p className={styles.rewardToast} role="status">+{r.rewardToast.coins} coins · Correct!</p>}
    {r.weapon.collected&&r.view==='explore'&&<div className={styles.weaponControls}>
      <span>{r.weapon.ammo} / 6 shots</span>
      {r.door==='OPEN'&&r.encounters.active?.phase==='waiting'&&<button onClick={()=>s.doorEvent({type:"close"})}>Close door</button>}
      <button disabled={!r.weapon.ammo} onClick={()=>window.dispatchEvent(new Event('anomalous-fire'))}>Fire</button>
    </div>}
  </>;
}
