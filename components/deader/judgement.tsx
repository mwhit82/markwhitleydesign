"use client";
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { roomAudio } from '@/lib/deader/audio/room-audio';
import { Cone } from './character';
import { GunModel } from './weapon';
import { DawnFace } from './scare-face';
import { JUDGEMENT_INTRO_SECONDS, JUDGEMENT_BLACKOUT_AT } from '@/lib/deader/judgement';
import styles from './game.module.css';
export function Judge(){
  const j=useGame(s=>s.room.judgement),group=useRef<THREE.Group>(null);
  const offset=useRef(new THREE.Vector3());
  useFrame(({camera})=>{
    const s=useGame.getState(),j=s.room.judgement;
    if(!group.current||!j)return;
    const gentle=s.save.settings.gentleScares||s.save.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
    group.current.visible=j.elapsed<JUDGEMENT_INTRO_SECONDS;
    group.current.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.renderOrder=100;const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){material.depthTest=false;material.depthWrite=false;}}});
    group.current.position.copy(offset.current.set(0,-1.15,gentle?-2.3:-2.2).applyQuaternion(camera.quaternion).add(camera.position));
    group.current.quaternion.copy(camera.quaternion);
  });
  return j?<><DawnFace/><group ref={group} userData={{ignoreBullet:true}}>
    <Cone colour="#a8a6a0" appearance="wide-mouth" animation="idle" paused/>
    <group position={[.38,.85,.35]} rotation={[0,Math.PI,0]} visible={j.failed}><GunModel/></group>
    <pointLight position={[0,1,1]} intensity={3} distance={3} color="#d3dbe4"/>
  </group></>:null;
}
export function JudgementUI(){
  const s=useGame(),j=s.room.judgement;
  const cue=useRef(false);
  useEffect(()=>{
    if(!j){cue.current=false;return;}
    if(j.elapsed>=JUDGEMENT_INTRO_SECONDS&&!cue.current&&!s.panel&&!s.suspension&&s.focused){cue.current=true;if(j.failed)roomAudio.play('shot');roomAudio.dawnScream();}
  },[j,s.panel,s.suspension,s.focused]);
  useEffect(()=>{if(!j||s.panel||s.suspension||!s.focused)roomAudio.stopDawnScream();},[j,s.panel,s.suspension,s.focused]);
  useEffect(()=>()=>roomAudio.stopDawnScream(),[]);
  if(!j||s.panel)return null;
  return <div className={`${styles.judgement} ${j.elapsed>=JUDGEMENT_BLACKOUT_AT?styles.judgementBlack:''}`} role="status">
    <p className={styles.eyebrow}>5:55 AM · THE AUDITOR</p>
    <h2>{j.elapsed<2?'Your shift is over.':j.elapsed<JUDGEMENT_INTRO_SECONDS?`${j.mistakes} mistake${j.mistakes===1?'':'s'}.`:j.failed?'You failed the judgement.':'You may leave. For now.'}</h2>
    <p>{j.elapsed<JUDGEMENT_INTRO_SECONDS?'Fewer than three mistakes to survive.':j.failed?'The room falls silent.':'Night survived.'}</p>
    <button onClick={()=>s.open('pause')}>Pause</button>
  </div>;
}
