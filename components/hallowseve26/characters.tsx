'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry,ConeGeometry,CylinderGeometry,SphereGeometry,IcosahedronGeometry,InstancedMesh,Matrix4,Quaternion,Vector3,Euler,Color} from 'three';
import {characterParts,PIVOTS,type CharacterKind,type RigPart,type Joint} from './character-model';
import {heightAt,type Game,type Actor,type Elf} from './simulation';
import type {Shape} from './models';
const shapes:Shape[]=['box','cone','cylinder','sphere','rock'];const noop=()=>{};
type Figure=Actor & {id:number;kind:CharacterKind;hp?:number;maxHp?:number;cargo?:Elf['cargo'];tool?:string};
const templates=new Map<string,RigPart[]>();
export default function Characters({g,paused,reduced,speed}:{g:Game;paused:boolean;reduced:boolean;speed:number}){
 const refs=useRef<Partial<Record<Shape,InstancedMesh>>>({});const clock=useRef(0);const previous=useRef(new Map<number,{x:number;z:number;heading:number;hp:number;hit:number;figure:Figure;missing:number}>());
 const geometries=useMemo(()=>[new BoxGeometry(),new ConeGeometry(.5,1,8),new CylinderGeometry(.5,.5,1,8),new SphereGeometry(.5,8,6),new IcosahedronGeometry(.5,0)],[]);
 useEffect(()=>()=>geometries.forEach(x=>x.dispose()),[geometries]);
 const matrix=useMemo(()=>new Matrix4(),[]),root=useMemo(()=>new Matrix4(),[]),joint=useMemo(()=>new Matrix4(),[]),local=useMemo(()=>new Matrix4(),[]),q=useMemo(()=>new Quaternion(),[]),p=useMemo(()=>new Vector3(),[]),scale=useMemo(()=>new Vector3(),[]),euler=useMemo(()=>new Euler(),[]),color=useMemo(()=>new Color(),[]);
 useFrame((_,dt)=>{if(!paused)clock.current+=Math.min(dt,.1)*speed;const time=clock.current;const figures:Figure[]=[...g.elves.map(e=>({...e,kind:'elf' as const,tool:e.assignment?.type==='harvest'?(g.buildings.find(b=>b.id===e.assignment?.buildingId)?.kind==='lumber'?'chop':'mine'):e.assignment?.type==='build'?'build':''})),...g.troops,...g.enemies.map(e=>({...e,kind:e.clan})),...(g.santa.recovering<=0?[{...g.santa,id:-1,kind:'santa' as const}]:[])];
 const alive=new Set(figures.map(a=>a.id));for(const [id,old] of previous.current){if(alive.has(id))continue;if(!paused)old.missing+=dt;if(old.missing>.55||reduced){previous.current.delete(id);continue;}figures.push(old.figure);}
 const counts:Record<string,number>={box:0,cone:0,cylinder:0,sphere:0,rock:0};
 for(const a of figures){let old=previous.current.get(a.id);if(!old){old={x:a.x,z:a.z,heading:a.heading??0,hp:a.hp??1,hit:0,figure:a,missing:0};previous.current.set(a.id,old);}if(alive.has(a.id)){old.figure=a;old.missing=0;}if((a.hp??1)<old.hp)old.hit=.24;old.hp=a.hp??1;if(!paused)old.hit=Math.max(0,old.hit-dt);const f=1-Math.exp(-dt*22);old.x+=(a.x-old.x)*f;old.z+=(a.z-old.z)*f;const delta=Math.atan2(Math.sin((a.heading??0)-old.heading),Math.cos((a.heading??0)-old.heading));old.heading+=delta*f;
 const walking=a.activity==='walk'||a.activity==='carry',working=['chop','mine','build','saw','craft'].includes(a.activity??''),attack=a.activity==='attack'||a.activity==='cast',carrying=!!a.cargo&&Object.values(a.cargo).some(n=>n>0),witch=a.kind==='witch',zombie=a.kind==='zombie';const phase=time*(zombie?5:8)+a.id*.7,bob=reduced?0:walking?Math.abs(Math.sin(phase))*.045:Math.sin(time*2+a.id)*.012;const size=a.kind==='king'?1.65:1.1;
 root.compose(p.set(old.x,heightAt(old.x,old.z)+(witch?1.35+Math.sin(time*2+a.id)*.14:0)+bob,old.z),q.setFromEuler(euler.set(zombie?.17:0,old.heading,old.missing?old.missing*2.4:old.hit?-.12:witch&&walking?Math.sin(phase*.3)*.07:0)),scale.set(size,size,size));
 const key=a.kind+':'+(a.tool??'');if(!templates.has(key))templates.set(key,characterParts(a.kind,a.tool));
 for(const part of templates.get(key)!){if(part.joint==='cargo'&&!carrying)continue;if(part.joint==='tool'&&!working)continue;const mesh=refs.current[part.shape];if(!mesh)continue;const idx=counts[part.shape]++;if(idx>=6000)continue;let angle=0;const side=part.joint.startsWith('left')?-1:1;if(part.joint.endsWith('Leg'))angle=witch?-.7:walking?Math.sin(phase)*.65*side:0;if(part.joint.endsWith('Arm'))angle=zombie?-1.4:carrying?-.9:working?-.6-Math.max(0,Math.sin(phase))*.95:attack?-1.4+Math.sin(phase*1.5)*.5:walking?-Math.sin(phase)*.5*side:0;if(part.joint==='tool')angle=working?-.6-Math.max(0,Math.sin(phase))*.95:0;
 const pivot=PIVOTS[part.joint as Joint];joint.makeTranslation(...pivot);joint.multiply(local.makeRotationX(reduced?angle*.4:angle));joint.multiply(local.makeTranslation(-pivot[0],-pivot[1],-pivot[2]));local.compose(p.set(part.x,part.y,part.z+(part.joint==='barrel'&&attack?-.16*Math.abs(Math.sin(phase*2)):0)),q.setFromEuler(euler.set(part.rx,part.ry,part.rz)),scale.set(part.w,part.h,part.d));matrix.copy(root).multiply(joint).multiply(local);mesh.setMatrixAt(idx,matrix);mesh.setColorAt(idx,color.set(old.hit?'#fff3cd':part.color));}
 }
 for(const shape of shapes){const mesh=refs.current[shape];if(mesh){mesh.count=Math.min(counts[shape],6000);mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}
 });
 return <>{shapes.map((shape,i)=><instancedMesh key={shape} ref={node=>{if(node)refs.current[shape]=node;}} args={[geometries[i],undefined,6000]} frustumCulled={false} castShadow={!reduced} raycast={noop}><meshStandardMaterial roughness={.72}/></instancedMesh>)}</>;
}
