'use client';

import { memo, useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { Color, InstancedMesh, Object3D, MOUSE, TOUCH, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { biome, centre, CATALOG, onIsland, placementError, sizeOf, type Game, type Kind, type Point, type Building } from './simulation';

type Voxel = { x:number; y:number; z:number; w:number; h:number; d:number; color:string };
const add=(list:Voxel[],x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>list.push({x,y,z,w,h,d,color});
const hash=(x:number,z:number)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
const palette:Record<string,string[]>= {snow:['#c5d7d4','#dce6dc','#b9cecb'],forest:['#384e43','#455e47','#566c4b'],pumpkin:['#896344','#9b7346','#6e603c'],marsh:['#3b5350','#425e58','#4e6960'],graveyard:['#676a76','#737785','#5c6170']};
function pine(list:Voxel[],x:number,z:number,height=2.2,snow=false){
  add(list,x,.5,z,.25,1,.25,'#534338');
  for(let i=0;i<3;i++){const w=1.25-i*.3;add(list,x,.8+i*.55,z,w,height*.35,w,i===2?'#476e62':'#294e43');if(snow)add(list,x,.8+i*.55+height*.175,z,w,.12,w,'#d1e1d7');}
}
function islandVoxels(){
  const v:Voxel[]=[];
  for(let x=-16;x<=16;x++)for(let z=-16;z<=16;z++){
    if(!onIsland(x,z))continue;
    const b=biome(x,z),r=hash(x,z),c=palette[b];
    add(v,x,-.3,z,1,.6,1,c[Math.floor(r*3)]);
    const edge=!onIsland(x+1,z)||!onIsland(x-1,z)||!onIsland(x,z+1)||!onIsland(x,z-1);
    if(edge){add(v,x,-1.1,z,1,1.1,1,'#4d4b4b');add(v,x,-1.9+r*.2,z,.92,.7,.92,'#363d46');}
    if(Math.hypot(x,z)<7||Math.abs(Math.abs(x)-11)<2&&Math.abs(Math.abs(z)-10)<2||Math.abs(Math.abs(x)-15)<2&&Math.abs(Math.abs(z)-8)<2||Math.abs(Math.abs(x)-10)<2&&Math.abs(z-5)<2)continue;
    if(b==='forest'&&r>.67)pine(v,x,z,2.4,r>.9);
    if(b==='snow'&&r>.83)pine(v,x,z,1.8,true);
    if(b==='pumpkin'){
      if(r>.85){add(v,x,.7,z,.2,1.4,.2,'#47362b');add(v,x,1.6,z,1.1,.9,1.1,r>.93?'#b1773d':'#945238');add(v,x+.3,1.95,z,.65,.5,.7,'#bd8b46');}
      else if(r>.58){add(v,x,.22,z,.45,.43,.44,'#bb692c');add(v,x,.48,z,.1,.15,.1,'#4c5b35');}
    }
    if(b==='marsh'){
      if(r>.89){add(v,x,.9,z,.22,1.8,.22,'#454344');add(v,x+.27,1.45,z,.65,.15,.17,'#454344');}
      else if(r>.63)add(v,x,.025,z,.84,.06,.85,'#30494e');
      if(r<.1)add(v,x,.2,z,.13,.4,.13,'#8aaba0');
    }
    if(b==='graveyard'&&r>.77){add(v,x,.3,z,.42,.6,.2,'#97958c');add(v,x,.67,z,.55,.16,.2,'#aba99c');}
  }
  // Curved snow paths from the settlement towards the four shrines.
  for(const sx of [-1,1])for(const sz of [-1,1])for(let i=3;i<12;i++)add(v,sx*i,.035,sz*Math.round(i*.85),.8,.05,.8,'#a6b4a9');
  return v;
}
const disabledRaycast=()=>{};
function Instances({voxels,color}:{voxels:Voxel[];color:string}){
  const mesh=useRef<InstancedMesh>(null);
  useLayoutEffect(()=>{if(!mesh.current)return;const o=new Object3D();voxels.forEach((v,i)=>{o.position.set(v.x,v.y,v.z);o.scale.set(v.w,v.h,v.d);o.updateMatrix();mesh.current!.setMatrixAt(i,o.matrix);});mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();},[voxels]);
  return <instancedMesh ref={mesh} args={[undefined,undefined,voxels.length]} receiveShadow raycast={disabledRaycast}><boxGeometry/><meshStandardMaterial color={color} roughness={.95}/></instancedMesh>;
}
const Voxels=memo(function Voxels({items}:{items:Voxel[]}){
  const groups=useMemo(()=>{const m=new Map<string,Voxel[]>();for(const v of items){if(!m.has(v.color))m.set(v.color,[]);m.get(v.color)!.push(v);}return [...m.entries()];},[items]);
  return <>{groups.map(([color,voxels])=><Instances key={`${color}-${voxels.length}`} color={color} voxels={voxels}/>)}</>;
});
function buildingVoxels(b:Building){
  const list:Voxel[]=[],p=centre(b),size=sizeOf(b),level=b.level;
  const angle=b.rotation*Math.PI/2,cos=Math.round(Math.cos(angle)),sin=Math.round(Math.sin(angle));
  const put=(x:number,y:number,z:number,w:number,h:number,d:number,c:string)=>add(list,p.x+x*cos+z*sin,y,p.z+z*cos-x*sin,b.rotation%2?d:w,h,b.rotation%2?w:d,c);
  if(b.progress<1){
    put(0,.08,0,size*.94,.16,size*.94,'#b9a17a');
    for(const dx of [-1,1])for(const dz of [-1,1])put(dx*(size*.5-.1),.55,dz*(size*.5-.1),.12,1.1,.12,'#826446');
    put(0,.35,0,size*.85,.15,size*.85,'#876e52');
    put(0,.75,0,size*.8*b.progress,.12,.2,'#edcf7d');return list;
  }
  if(b.kind==='hearth'){
    put(0,.25,0,2,.5,2,'#8e8c83');put(0,.7,0,1.5,.4,1.5,'#b6b2a0');
    put(0,1.25,0,.55,1,.55,'#e4a64d');put(0,1.8,0,.32,.65,.32,'#fff1b1');
    for(const dx of [-.8,.8])for(const dz of [-.8,.8]){put(dx,1,dz,.22,1.6,.22,'#6b6458');put(dx,1.85,dz,.32,.3,.32,'#e9c379');}
    put(0,2.2,0,2.2,.22,2.2,'#3a6658');put(0,2.42,0,1.6,.24,1.6,'#4c7c65');put(0,2.62,0,1,.2,1,'#c9dcd0');
  }else if(b.kind==='workshop'){
    put(0,.12,0,size,.24,size,'#a7a89a');put(0,.8,0,size-.12,1.3,size-.12,'#784539');
    put(0,.4,0,size+.04,.14,size+.04,'#d2b99a');
    for(const dx of [-1,1])for(const dz of [-1,1])put(dx*(size/2-.15),.85,dz*(size/2-.15),.15,1.5,.15,'#dbc7a3');
    for(let i=0;i<3;i++)put(0,1.6+i*.23,0,size+.25-i*.35,.25,size+.3-i*.28,i===2?'#d6e3dc':'#365e50');
    put(size*.25,2.1,-size*.22,.3,1,.35,'#8a8175');put(size*.25,2.65,-size*.22,.44,.15,.48,'#c9d5cd');
    put(0,.65,size*.5,.4,1,.06,'#342f30');
    for(const side of [-1,1]){put(side*size*.29,.95,size*.5,.35,.4,.05,'#ffd58b');put(size*.5,.95,side*size*.29,.05,.4,.35,'#ffd58b');}
    for(let i=0;i<5;i++){put(-size*.43+i*size*.215,1.53,size*.53,.08,.08,.08,i%2?'#e6a85b':'#f6df98');}
  }else if(b.kind==='wall'||b.kind==='gate'){
    if(b.kind==='wall'){put(0,.6,0,.94,1.2,.94,'#919c99');put(0,.72,.48,.75,.06,.03,'#6b7877');}
    else{put(-.37,.65,0,.22,1.3,.85,'#919c99');put(.37,.65,0,.22,1.3,.85,'#919c99');put(0,1.1,0,.7,.3,.85,'#6d7e76');put(0,.65,0,.5,.9,.13,'#8a6c48');}
    for(const dx of [-.3,.3])for(const dz of [-.3,.3])put(dx,1.3,dz,.3,.3,.3,'#d4dfd5');
    if(level>1)put(0,1.45,0,.16,.9,.16,'#d6b56a');
  }else{
    put(0,.3,0,.85,.6,.85,'#8e9b96');put(0,.7,0,.68,.22,.68,'#d7d9c9');
    if(b.kind==='nutcracker'){
      put(0,1,0,.4,.55,.35,'#a74f43');put(0,1.43,0,.35,.3,.35,'#dfb68e');put(0,1.72,0,.45,.3,.4,'#294e48');put(0,1.78,.22,.13,.13,.07,'#e9c572');put(.3,1.1,.1,.12,.7,.12,'#433d39');
    }else if(b.kind==='snowglobe'){
      put(0,1,0,.6,.42,.6,'#91bfc7');put(0,1.3,0,.43,.22,.43,'#c1e6df');put(0,1.47,0,.23,.2,.23,'#f0f5dd');
    }else{
      put(0,1,0,.65,.5,.65,'#834d6b');put(0,1.27,0,.8,.08,.8,'#c79d68');put(0,1.5,0,.13,.4,.13,'#c7c4a4');put(0,1.8,0,.4,.35,.4,'#dbb889');put(0,2,0,.5,.12,.5,'#a14e48');
    }
    if(level>1){put(-.35,.95,-.35,.12,.55,.12,'#efc875');put(.35,.95,.35,.12,.55,.12,'#efc875');}
  }
  return list;
}
function settlementVoxels(g:Game,reduced:boolean){
  const v=g.buildings.flatMap(buildingVoxels);
  for(const b of g.buildings){
    if(b.hp<b.maxHp){const c=centre(b),w=Math.max(1,sizeOf(b));add(v,c.x,3.1,c.z,w,.08,.12,'#3e4141');add(v,c.x-(w*(1-b.hp/b.maxHp))/2,3.12,c.z,w*Math.max(0,b.hp/b.maxHp),.08,.14,'#b5cd91');}
  }
  for(const s of g.shrines){
    add(v,s.x,.15,s.z,1.6,.3,1.6,'#8c8a87');add(v,s.x,.8,s.z,.45,1.2,.45,s.restored?'#d8b978':'#685774');
    add(v,s.x,1.6,s.z,.85,.45,.85,s.restored?'#f2d796':'#8e72a3');add(v,s.x,1.95,s.z,.35,.3,.35,s.restored?'#fff2bd':'#b393ba');
    if(s.restored)for(let i=0;i<3;i++)add(v,s.x-.7+i*.7,.5,s.z+.8,.4,.6,.4,i%2?'#8d4946':'#416c55');
  }
  for(const d of g.deposits){
    if(d.resource==='wood'){for(let i=0;i<3;i++)add(v,d.x-.3+i*.3,.3,d.z,.22,.4,1,'#84664c');}
    else {add(v,d.x,.3,d.z,1,.6,.8,'#abb0ad');add(v,d.x+.2,.7,d.z,.5,.4,.5,'#c9ceca');}
  }
  const clock=g.phase==='night'?g.nightTime:120-g.time;
  if(!reduced)for(const b of g.buildings.filter(b=>b.kind==='workshop'&&b.progress===1)){
    const c=centre(b),size=sizeOf(b),angle=b.rotation*Math.PI/2;
    const chimneyX=size*.25*Math.cos(angle)-size*.22*Math.sin(angle),chimneyZ=-size*.22*Math.cos(angle)-size*.25*Math.sin(angle);
    for(let i=0;i<3;i++){const t=(clock*.35+i*.7)%2;add(v,c.x+chimneyX+t*.22,2.8+t,c.z+chimneyZ,.2+t*.12,.2+t*.1,.2+t*.12,'#acb9b5');}
  }
  const person=(x:number,z:number,color:string,santa=false)=>{
    add(v,x,.2,z-.12,.2,.4,.22,'#353a38');add(v,x,.2,z+.12,.2,.4,.22,'#353a38');
    add(v,x,.65,z,.45,.6,.4,color);add(v,x,.99,z,.3,.28,.3,'#e1bd98');
    add(v,x,1.19,z,.4,.19,.4,color);add(v,x+.08,1.34,z,.22,.16,.22,color);
    if(santa){add(v,x+.18,.98,z,.13,.3,.33,'#eee5d4');add(v,x,.45,z,.48,.12,.42,'#f2e7cf');add(v,x+.16,1.46,z,.12,.12,.12,'#fff0d8');}
  };
  for(const e of g.elves)person(e.x,e.z,'#4c9075');
  if(g.santa.recovering<=0)person(g.santa.x,g.santa.z,'#be5649',true);
  for(const e of g.enemies){
    const king=e.clan==='king',w=king?1.1:.46,h=king?1.4:.65;
    add(v,e.x,h*.5,e.z,w,h,w,e.clan==='witch'?'#674c80':e.clan==='skeleton'?'#a8a695':'#604831');
    add(v,e.x,h+.24,e.z,w*.95,king?.65:.42,w*.95,e.clan==='pumpkin'||king?'#c87a35':e.clan==='witch'?'#9bad89':'#d1c9ad');
    add(v,e.x+w*.49,h+.27,e.z-.1,.025,.09,.08,'#e5bc6a');add(v,e.x+w*.49,h+.27,e.z+.1,.025,.09,.08,'#e5bc6a');
    if(e.hp<e.maxHp){add(v,e.x,h+.95,e.z,w,.06,.1,'#453e43');add(v,e.x-(w*(1-e.hp/e.maxHp))/2,h+.97,e.z,w*Math.max(0,e.hp/e.maxHp),.06,.12,'#c9a472');}
    if(e.clan==='witch'){add(v,e.x,h+.55,e.z,.8,.13,.8,'#3b354c');add(v,e.x,h+.8,e.z,.35,.4,.35,'#4a3a60');}
    if(king)for(let i=0;i<3;i++)add(v,e.x-.4+i*.4,h+.7,e.z,.17,.6,.7,'#ac975e');
  }
  return v;
}
function Shot({effect,reduced}:{effect:Game['effects'][number];reduced:boolean}){
  const progress=1-effect.life/effect.total;
  return <mesh position={[effect.from.x+(effect.to.x-effect.from.x)*progress,1.3+(reduced?0:Math.sin(progress*Math.PI)*1.4),effect.from.z+(effect.to.z-effect.from.z)*progress]} raycast={disabledRaycast}><boxGeometry args={[.13,.13,.13]}/><meshBasicMaterial color={effect.color}/></mesh>;
}
function Atmosphere({night,reduced}:{night:boolean;reduced:boolean}){
  const {scene}=useThree();
  useFrame((_,dt)=>{const target=new Color(night?'#111b2c':'#a8bcc0');if(scene.background instanceof Color)scene.background.lerp(target,reduced?1:Math.min(1,dt*.7));});
  return <><color attach="background" args={['#a8bcc0']}/><fog attach="fog" args={[night?'#111b2c':'#a8bcc0',48,105]}/><ambientLight intensity={night?.65:1.6} color={night?'#a6c4e9':'#f6ebd4'}/><directionalLight position={[-15,28,8]} intensity={night?.7:2.6} color={night?'#a6bfe2':'#ffe0ab'}/><hemisphereLight args={['#9cb6ca','#4b4240',night?.6:1]}/></>;
}
function Camera({focus,santa}:{focus:number;santa:Point}){
  const controls=useRef<OrbitControlsImpl>(null);const {camera,size}=useThree();
  const previousFit=useRef<number|null>(null);const currentSanta=useRef(santa);currentSanta.current=santa;
  useEffect(()=>{const fit=Math.max(9,Math.min(size.width/48,size.height/39));camera.zoom=previousFit.current===null?fit:Math.max(8,Math.min(55,camera.zoom*fit/previousFit.current));previousFit.current=fit;camera.updateProjectionMatrix();},[camera,size.width,size.height]);
  useEffect(()=>{if(!controls.current)return;const target=new Vector3(currentSanta.current.x,0,currentSanta.current.z),delta=target.clone().sub(controls.current.target);camera.position.add(delta);controls.current.target.copy(target);controls.current.update();},[focus,camera]); // Explicit recenter only.
  useFrame(()=>{const c=controls.current;if(!c)return;const x=Math.max(-17,Math.min(17,c.target.x)),z=Math.max(-17,Math.min(17,c.target.z));camera.position.x+=x-c.target.x;camera.position.z+=z-c.target.z;c.target.set(x,0,z);});
  return <OrbitControls ref={controls} makeDefault regress enableRotate={false} enableDamping dampingFactor={.12} minZoom={8} maxZoom={55} mouseButtons={{LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.PAN}} touches={{ONE:TOUCH.PAN,TWO:TOUCH.DOLLY_PAN}}/>;
}
function Scene({g,build,hover,rotation,onHover,onTile,focus,reduced}:{g:Game;build:Kind|null;hover:Point|null;rotation:number;onHover:(p:Point)=>void;onTile:(p:Point)=>void;focus:number;reduced:boolean}){
  const land=useMemo(islandVoxels,[]);
  const models=settlementVoxels(g,reduced);
  const down=useRef<{x:number;y:number}|null>(null);
  const night=g.phase==='night'||g.phase==='lost';
  const point=(e:ThreeEvent<PointerEvent>)=>({x:Math.round(e.point.x),z:Math.round(e.point.z)});
  const valid=hover&&build&&!placementError(g,build,hover.x,hover.z);
  const previewSize=build?CATALOG[build].size:1;
  return <>
    <Atmosphere night={night} reduced={reduced}/><Camera focus={focus} santa={g.santa}/>
    <Voxels items={land}/><Voxels items={models}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.06,0]} onPointerDown={e=>{down.current={x:e.clientX,y:e.clientY};}} onPointerMove={e=>{if(build)onHover(point(e));}} onPointerUp={e=>{if(down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)<7)onTile(point(e));down.current=null;}}>
      <planeGeometry args={[42,42]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    {!build&&g.buildings.map(b=><mesh key={`hit-${b.id}`} position={[centre(b).x,1,centre(b).z]} onPointerDown={e=>{e.stopPropagation();down.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{e.stopPropagation();if(down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)<7)onTile({x:b.x,z:b.z});down.current=null;}}><boxGeometry args={[sizeOf(b),b.kind==='workshop'||b.kind==='hearth'?2.8:2,sizeOf(b)]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
    {!build&&g.shrines.map(s=><mesh key={`shrine-hit-${s.id}`} position={[s.x,1,s.z]} onPointerDown={e=>{e.stopPropagation();down.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{e.stopPropagation();if(down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)<7)onTile(s);down.current=null;}}><boxGeometry args={[1.5,2.2,1.5]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
    {g.buildings.filter(b=>b.kind==='workshop'||b.kind==='hearth').slice(0,10).map(b=><group key={b.id}>
      {night&&b.progress===1&&<pointLight position={[centre(b).x,2.5,centre(b).z]} intensity={b.kind==='hearth'?22:15} distance={b.kind==='hearth'?8:6} color="#ffc66c" decay={1.6}/>}
      {night&&b.progress===1&&<mesh position={[centre(b).x,.065,centre(b).z]} rotation={[-Math.PI/2,0,0]} raycast={disabledRaycast}><circleGeometry args={[b.kind==='hearth'?3:2.6,32]}/><meshBasicMaterial color="#f7c96a" transparent opacity={.055} depthWrite={false}/></mesh>}
    </group>)}
    {hover&&build&&onIsland(hover.x,hover.z)&&<group position={[hover.x+(previewSize-1)/2,.12,hover.z+(previewSize-1)/2]} rotation={[0,rotation*Math.PI/2,0]}><mesh raycast={disabledRaycast}><boxGeometry args={[previewSize*.96,.16,previewSize*.96]}/><meshBasicMaterial color={valid?'#b9f4bb':'#ec7b75'} transparent opacity={.65}/></mesh></group>}
    {g.santa.recovering<=0&&<mesh position={[g.santa.x,.09,g.santa.z]} rotation={[-Math.PI/2,0,0]} raycast={disabledRaycast}><ringGeometry args={[.45,.54,24]}/><meshBasicMaterial color="#ffe9ab"/></mesh>}
    {g.effects.map(e=><Shot key={e.id} effect={e} reduced={reduced}/>)}
    <AdaptiveDpr pixelated/>
  </>;
}
export default function World(props:Parameters<typeof Scene>[0]){
  return <Canvas orthographic camera={{position:[30,32,30],zoom:18,near:.1,far:160}} dpr={[1,1.5]} gl={{antialias:true,powerPreference:'high-performance'}}><Scene {...props}/></Canvas>;
}
