"use client";
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {useGLTF} from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { roomAudio } from '@/lib/deader/audio/room-audio';
import { Box, Sign } from './environment';
import styles from './game.module.css';
class GunFallback extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<SimpleGun/>:this.props.children;}
}
function SimpleGun(){return <group><Box position={[0,0,-.08]} size={[.07,.09,.34]} colour="#50545a"/><Box position={[0,-.12,.03]} size={[.06,.19,.09]} colour="#573b29"/></group>;}
function LoadedGun({firstPerson=false}:{firstPerson?:boolean}){
 const {scene}=useGLTF('/deader/service-pistol.glb');
 const model=useMemo(()=>{const copy=scene.clone(true);copy.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.userData.firstPersonWeapon=firstPerson;if(firstPerson){o.renderOrder=10;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.depthTest=false;m.depthWrite=false;});}}});return copy;},[scene,firstPerson]);
 useEffect(()=>()=>{if(firstPerson)model.traverse(o=>{if(o instanceof THREE.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});},[model,firstPerson]);
 return <primitive object={model} dispose={null}/>;
}
export function GunModel({firstPerson=false}:{firstPerson?:boolean}){return <GunFallback><Suspense fallback={<SimpleGun/>}><LoadedGun firstPerson={firstPerson}/></Suspense></GunFallback>;}
export function Weapon() {
  const {scene,camera}=useThree();
  const equipped=useGame(s=>s.room.weapon.collected);
  const held=useRef<THREE.Group>(null);
  const ray=useMemo(()=>new THREE.Raycaster(),[]);
  const centre=useMemo(()=>new THREE.Vector2(),[]);
  const offset=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{held.current?.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.userData.firstPersonWeapon=true;o.renderOrder=10;const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m.depthTest=false;m.depthWrite=false;});}});},[]);
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
    held.current.position.copy(offset.set(camera instanceof THREE.PerspectiveCamera ? Math.min(.18,.18*camera.aspect) : .18,-.20,-.55+(r.weapon.cooldown>.3?.04:0)).applyQuaternion(camera.quaternion).add(camera.position));
    held.current.quaternion.copy(camera.quaternion);
  });
  return <>
    <group position={[-3.45,1.15,1.65]} rotation={[0,Math.PI/2,0]} userData={{interaction:equipped ? "Put gun back" : "Take gun"}}>
      <Box position={[0,-.05,0]} size={[1,.12,.4]} colour="#44382b"/>
      {!equipped&&<group userData={{interaction:'Take gun'}} position={[0,.15,0]} rotation={[0,Math.PI/2,0]}><GunModel/><mesh visible={false} userData={{interactionProxy:true}}><boxGeometry args={[.65,.65,.7]}/><meshBasicMaterial/></mesh></group>}
      {equipped&&<mesh position={[0,.15,0]} visible={false} userData={{interactionProxy:true}}><boxGeometry args={[1,.65,.7]}/><meshBasicMaterial/></mesh>}
      <Sign text="SIX SHOTS / CHOOSE WISELY" position={[0,.43,-.14]} width={1} height={.2}/>
    </group>
    <group ref={held} scale={.65} visible={false} userData={{ignoreBullet:true}}><GunModel firstPerson/>
      {/* Black plastic hands and forearms match the cone character's limbs. */}
      <mesh position={[0,-.17,.12]} scale={[.045,.075,.055]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#17191c" roughness={.65}/></mesh>
      <mesh position={[-.055,-.09,-.06]} scale={[.055,.042,.075]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#17191c" roughness={.65}/></mesh>
      <Box position={[.04,-.30,.28]} size={[.065,.085,.4]} colour="#17191c" rotation={[-.4,-.15,0]}/>
      <Box position={[-.15,-.22,.17]} size={[.065,.075,.42]} colour="#17191c" rotation={[-.4,-.55,0]}/>
    </group>
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
