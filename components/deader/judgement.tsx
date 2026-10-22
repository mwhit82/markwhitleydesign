"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVR } from "@/lib/deader/vr-state";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { currentReveal, revealCaption } from "@/lib/deader/judgement";
import type { DawnEntry } from "@/lib/deader/visitors";
import { Cone } from "./character";
import { DawnFace } from "./scare-face";
import styles from "./game.module.css";
export function advanceReveal(all=false){
 const s=useGame.getState();if(!s.room.judgement||s.panel||s.suspension||!s.focused)return;
 s.advanceDawn(all);
 roomAudio.stopDawnScream();
}
function RevealedVisitor({entry}:{entry:DawnEntry}){
 const ref=useRef<THREE.Group>(null);
 useLayoutEffect(()=>{if(entry.shot)ref.current?.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.transparent=true;m.opacity=.45;m.depthWrite=false;}}});},[entry.shot]);
 return <group ref={ref}><Cone colour={entry.shot?"#98adb9":entry.profile.colour} appearance={entry.profile.appearance} animation="idle" paused lowDetail/></group>;
}
export function Judge(){
 const j=useGame(s=>s.room.judgement),group=useRef<THREE.Group>(null);
 const entry=j&&currentReveal(j), vr=useVR(s=>s.active);
 useLayoutEffect(()=>{if(vr)group.current?.traverse(o=>{if(o instanceof THREE.Mesh){o.renderOrder=100;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.depthTest=false;m.depthWrite=false;}}});},[vr,entry?.id]);
 const anchor=useRef<{p:THREE.Vector3;q:THREE.Quaternion}|null>(null);
 useFrame(({camera})=>{
  if(!j)anchor.current=null;
  if(!group.current||!j)return;
  if(useVR.getState().active){
    if(!anchor.current){const p=camera.getWorldPosition(new THREE.Vector3()),d=camera.getWorldDirection(new THREE.Vector3());const yaw=Math.atan2(-d.x,-d.z);anchor.current={p,q:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0))};}
    group.current.position.copy(anchor.current.p);group.current.quaternion.copy(anchor.current.q);group.current.translateY(-1.5);group.current.translateZ(-2.6);
  }else{group.current.position.set(.25,0,-3.15+Math.min(1,(j.elapsed%3)/.5)*.6);group.current.rotation.set(0,0,0);}

 });
 if(!j)return null;
 return <><DawnFace/>{entry&&<group ref={group} position={[.25,0,-2.55]} userData={{ignoreBullet:true}}>
  {useVR.getState().active&&<group position={[0,1,-.4]}>{[-1,1].map(x=><mesh key={x} position={[x,0,0]}><boxGeometry args={[.12,2.4,.16]}/><meshStandardMaterial color="#4e3525" roughness={.9}/></mesh>)}<mesh position={[0,1.2,0]}><boxGeometry args={[2.1,.12,.16]}/><meshStandardMaterial color="#4e3525" roughness={.9}/></mesh></group>}
  <RevealedVisitor key={entry.id} entry={entry}/>
  {entry.shot&&<mesh position={[0,.75,0]}><sphereGeometry args={[.65,16,12]}/><meshStandardMaterial color="#abcbd9" transparent opacity={.12} depthWrite={false}/></mesh>}
  {(j.entries??[]).slice(Math.floor(j.elapsed/3)+1,Math.floor(j.elapsed/3)+3).map((e,i)=><group key={e.id} position={[(i?1:-1)*.8,0,-.6]}><RevealedVisitor entry={e}/></group>)}
 </group>}</>;
}
export function JudgementUI(){
 const s=useGame(),j=s.room.judgement,entry=j&&currentReveal(j);
 const cue=useRef("");
 const id=entry?.id??"", judging=!!j;
 const scare=!!entry&&!entry.shot&&entry.profile.kind==="anomaly";
 useEffect(()=>{
  if(!j){cue.current="";return;}
  if(scare&&cue.current!==id&&!s.panel&&!s.suspension&&s.focused){cue.current=id;roomAudio.dawnScream();}
  if(entry?.shot&&cue.current!==id&&!s.panel&&!s.suspension&&s.focused){cue.current=id;roomAudio.play("rumble");}
  if(!scare||s.panel||s.suspension||!s.focused)roomAudio.stopDawnScream();
 },[j,id,entry?.shot,scare,s.panel,s.suspension,s.focused]);
 useEffect(()=>()=>roomAudio.stopDawnScream(),[]);
 useEffect(()=>{if(judging&&document.pointerLockElement)document.exitPointerLock();},[judging]);
 if(!j||s.panel)return null;
 return <div className={styles.dawnCaptions} role="status">
 <p>5:55 AM · {entry?"THE VISITORS RETURN":"SHIFT RESULTS"}</p>
 <h2>{entry?entry.profile.name:`${j.mistakes} mistake${j.mistakes===1?"":"s"} · ${j.failed?"Shift failed":"Night survived"}`}</h2>
 <p>{entry?revealCaption(entry):`Decision earnings: ${s.room.encounters.ledger.reduce((n,e)=>n+e.coins,0)} coins. Fewer than three mistakes to survive.`}</p>
 {entry&&<div><button onClick={()=>advanceReveal()}>Next</button><button onClick={()=>advanceReveal(true)}>Skip to results</button></div>}
 <button onClick={()=>s.open("pause")}>Pause</button>
 </div>;
}
