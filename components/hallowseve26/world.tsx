'use client';
import {memo,useMemo,useRef,useLayoutEffect,useEffect} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {BufferGeometry,Float32BufferAttribute,Color,InstancedMesh,Object3D,MOUSE,TOUCH,Vector3,Group,PCFShadowMap} from 'three';
import type {OrbitControls as Controls} from 'three-stdlib';
import {biome,bridge,riverX,heightAt,onIsland,centre,sizeOf,CATALOG,placementError,type Game,type Point,type Kind,type Building} from './simulation';

type Shape='box'|'cone'|'cylinder'|'sphere'|'rock'|'roof';
type Part={shape:Shape;color:string;x:number;y:number;z:number;w:number;h:number;d:number;ry:number;rz:number};
const noop=()=>{};
const hash=(x:number,z:number)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const add=(v:Part[],shape:Shape,color:string,x:number,y:number,z:number,w:number,h:number,d:number,ry=0,rz=0)=>v.push({shape,color,x,y,z,w,h,d,ry,rz});
function roofGeometry(){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-.5,-.5,-.5,.5,-.5,-.5,0,.5,-.5, -.5,-.5,.5,0,.5,.5,.5,-.5,.5, -.5,-.5,-.5,0,.5,-.5,0,.5,.5, -.5,-.5,-.5,0,.5,.5,-.5,-.5,.5, .5,-.5,-.5,.5,-.5,.5,0,.5,.5, .5,-.5,-.5,0,.5,.5,0,.5,-.5, -.5,-.5,-.5,-.5,-.5,.5,.5,-.5,.5, -.5,-.5,-.5,.5,-.5,.5,.5,-.5,-.5],3));g.computeVertexNormals();return g;}
function Batch({parts,shape,color,night,smooth}:{parts:Part[];shape:Shape;color:string;night:boolean;smooth:boolean}){
 const ref=useRef<InstancedMesh>(null);const targets=useRef<Float32Array|null>(null);const count=useRef(0);const roof=useMemo(()=>shape==='roof'?roofGeometry():undefined,[shape]);
 useLayoutEffect(()=>{if(!ref.current)return;const o=new Object3D(),array=ref.current.instanceMatrix.array;const next=new Float32Array(parts.length*3);parts.forEach((p,i)=>{next.set([p.x,p.y,p.z],i*3);o.position.set(p.x,p.y,p.z);o.rotation.set(0,p.ry,p.rz);o.scale.set(p.w,p.h,p.d);o.updateMatrix();if(smooth&&count.current===parts.length){o.matrix.elements[12]=array[i*16+12];o.matrix.elements[13]=array[i*16+13];o.matrix.elements[14]=array[i*16+14];}ref.current!.setMatrixAt(i,o.matrix);});targets.current=next;count.current=parts.length;ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();},[parts,smooth]);
 useFrame((_,dt)=>{if(!smooth||!ref.current||!targets.current)return;const a=ref.current.instanceMatrix.array,t=targets.current,f=Math.min(1,dt*22);for(let i=0;i<count.current;i++)for(let j=0;j<3;j++)a[i*16+12+j]+=(t[i*3+j]-a[i*16+12+j])*f;ref.current.instanceMatrix.needsUpdate=true;});
 useEffect(()=>()=>roof?.dispose(),[roof]);
 return <instancedMesh ref={ref} args={[undefined,undefined,parts.length]} castShadow receiveShadow raycast={noop}>
 {shape==='box'?<boxGeometry/>:shape==='cone'?<coneGeometry args={[.5,1,8]}/>:shape==='cylinder'?<cylinderGeometry args={[.5,.5,1,10]}/>:shape==='sphere'?<sphereGeometry args={[.5,10,8]}/>:shape==='rock'?<icosahedronGeometry args={[.5,0]}/>:<primitive object={roof!} attach="geometry"/>}
 <meshStandardMaterial color={color} roughness={.87} emissive={color==='#ffcf78'||color==='#b6f6f1'?color:'#000000'} emissiveIntensity={night?1.4:.15}/>
 </instancedMesh>;
}
const Models=memo(function Models({parts,night=false,smooth=false}:{parts:Part[];night?:boolean;smooth?:boolean}){const groups=useMemo(()=>{const m=new Map<string,Part[]>();for(const p of parts){const key=p.shape+p.color;if(!m.has(key))m.set(key,[]);m.get(key)!.push(p);}return [...m.values()];},[parts]);return <>{groups.map(p=><Batch key={p[0].shape+p[0].color} parts={p} shape={p[0].shape} color={p[0].color} night={night} smooth={smooth}/>)}</>;});
function pine(v:Part[],x:number,z:number,h:number,snow:boolean){const y=heightAt(x,z);add(v,'cylinder','#695141',x,y+h*.25,z,.18,h*.5,.18);for(let i=0;i<3;i++){const w=h*(.65-i*.16);add(v,'cone',i===0?'#214b43':'#336454',x,y+h*(.42+i*.2),z,w,h*.56,w);if(snow)add(v,'cone','#dce9df',x,y+h*(.52+i*.2),z,w*.72,h*.4,w*.72);}}
function terrain(){const g=new BufferGeometry(),pos:number[]=[],colors:number[]=[];const c=new Color();const palette={snow:'#c6d7cd',forest:'#486c50',pumpkin:'#ad8753',marsh:'#526969'};for(let x=-32;x<32;x++)for(let z=-30;z<30;z++){if(!onIsland(x+.5,z+.5))continue;for(const [dx,dz]of [[0,0],[0,1],[1,1],[0,0],[1,1],[1,0]]){const px=x+dx,pz=z+dz;pos.push(px,heightAt(px,pz),pz);c.set(palette[biome(px,pz) as keyof typeof palette]);c.multiplyScalar(.94+hash(x,z)*.12);colors.push(c.r,c.g,c.b);}}g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
function landscape(g:Game){const v:Part[]=[];
 for(let x=-30;x<=30;x+=1.7)for(let z=-28;z<=28;z+=1.7){if(!onIsland(x,z))continue;const r=hash(x,z),b=biome(x,z),y=heightAt(x,z);if(!onIsland(x+1.8,z)||!onIsland(x-1.8,z)||!onIsland(x,z+1.8)||!onIsland(x,z-1.8)){add(v,'rock','#66777a',x,y-1.5,z,2.8,3.3,2.5,r*6);add(v,'rock','#435965',x,-3,z,2.7,2.6,2.8,r*5);}
 if(Math.hypot(x+1,z)<9||Math.abs(x-riverX(z))<3||g.camps.some(c=>Math.hypot(c.x-x,c.z-z)<4)||g.shrines.some(s=>Math.hypot(s.x-x,s.z-z)<2.5))continue;
 if(b==='forest'&&r>.29||b==='snow'&&r>.81)pine(v,x,z,2.2+r*2.5,b==='snow'||r>.8);
 else if(b==='pumpkin'&&r>.73){add(v,'cylinder','#695141',x,y+1,z,.2,2,.2);for(let i=0;i<3;i++)add(v,'rock',i%2?'#cb9c50':'#b77343',x+(i-1)*.45,y+2+i*.2,z,1.8,1.7,1.7,i);}
 else if(b==='pumpkin'&&r<.23){add(v,'sphere','#cd7c31',x,y+.22,z,.55,.44,.55);add(v,'cylinder','#5a6040',x,y+.5,z,.09,.2,.09);}
 else if(b==='marsh'&&r>.7){add(v,'cylinder','#5f5e65',x,y+1,z,.22,2,.22,.3,.15);add(v,'cylinder','#5f5e65',x+.3,y+1.7,z,.12,1,.12,0,-.8);add(v,'sphere','#b6f6f1',x+.3,y+.6,z,.1,.1,.1);}
 else if(r>.87)add(v,'rock','#9ba79d',x,y+.25,z,.8,.6,1,r*5);
 }
 // Timber bridges, with planks, stone abutments, and railings.
 for(const z of [-12,9]){const x=riverX(z);for(let i=-4;i<=4;i++)add(v,'box','#927657',x+i*.5,.32,z,.46,.18,2.5);for(const dz of [-1.15,1.15]){add(v,'box','#705542',x,.9,z+dz,4.7,.12,.12);for(const dx of [-2,-1,0,1,2])add(v,'box','#705542',x+dx,.65,z+dz,.16,1,.16);}for(const dx of [-2.4,2.4])add(v,'box','#a2ada5',x+dx,.12,z,.55,.6,2.8);}
 return v;
}
function buildingParts(b:Building,clock:number){const v:Part[]=[],c=centre(b),s=sizeOf(b),base=heightAt(c.x,c.z),angle=b.rotation*Math.PI/2;const put=(shape:Shape,col:string,x:number,y:number,z:number,w:number,h:number,d:number,ry=0,rz=0)=>{const co=Math.cos(angle),si=Math.sin(angle);add(v,shape,col,c.x+x*co+z*si,base+y,c.z+z*co-x*si,w,h,d,ry+angle,rz);};
 if(b.kind==='road'){put('box','#a6a79a',0,.035,0,.98,.07,.98);for(const z of [-.25,.25])for(const x of [-.25,.25])put('box','#c3c2ae',x,.08,z,.44,.05,.43);return v;}
 put('box','#8d9b99',0,.15,0,s+.1,.3,s+.1);
 if(b.progress<1){for(const dx of [-1,1])for(const dz of [-1,1])put('cylinder','#a58055',dx*s*.45,1,dz*s*.45,.12,2,.12);for(const y of [.6,1.5]){put('box','#aa875e',0,y,-s*.45,s,.12,.12);put('box','#aa875e',0,y,s*.45,s,.12,.12);}put('box','#b9aaa0',0,.3+b.progress*.5,0,s*.8,.6*b.progress+.1,s*.8);return v;}
 if(b.kind==='wall'||b.kind==='gate'){
  if(b.kind==='wall'){put('box','#a8b4b0',0,.9,0,.96,1.6,.88);for(let i=0;i<4;i++)put('box','#7c918e',i%2?.1:-.1,.35+i*.35,.446,.7,.035,.015);}
  else{for(const x of [-.38,.38])put('box','#a8b4b0',x,.9,0,.22,1.7,.9);put('box','#a8b4b0',0,1.6,0,.9,.35,.9);for(const x of [-.2,0,.2])put('box','#98754e',x,.85,0,.13,1.35,.15);}
  for(const x of [-.32,.32])for(const z of [-.28,.28])put('box','#dce7dc',x,1.85,z,.28,.35,.3);return v;
 }
 if(b.kind==='hearth'){
  put('box','#d0d5c3',0,1.2,0,2.7,2.1,2.7);put('box','#7a8f86',0,.5,0,2.9,.4,2.9);put('roof','#36665d',0,2.8,0,3.25,1.6,3.4);put('roof','#e8eee1',0,3.03,0,2.95,1.35,3.35);
  for(const x of [-1.4,1.4])for(const z of [-1.4,1.4]){put('cylinder','#b5c1b6',x,1.7,z,.85,3,.85);put('cylinder','#e1e6d8',x,3.2,z,1,.3,1);put('cone','#3b6d63',x,3.8,z,1.2,1.2,1.2);put('cone','#e2ece0',x,3.97,z,.96,.94,.96);put('cylinder','#bda161',x,4.5,z,.05,.6,.05);put('box','#ad4546',x+.2,4.65,z,.4,.25,.035);}
  put('box','#654c3b',0,.9,1.37,.7,1.4,.1);put('roof','#a3453d',0,1.8,1.6,1.1,.6,.6);for(const x of [-.85,.85]){put('box','#ffcf78',x,1.5,1.38,.4,.65,.06);put('box','#5e7467',x,1.5,1.42,.04,.7,.04);}
  put('cone','#31594b',0,3.9,0,.75,1.4,.75);put('sphere','#ffcf78',0,4.7,0,.25,.25,.25);
 }else if(['home','store','sawmill','workshop','lumber','quarry'].includes(b.kind)){
  const workshop=b.kind==='workshop',h=workshop?1.8:1.2,body=workshop?'#a45644':b.kind==='home'?'#d6bf91':'#9a8b68';
  put('box',body,0,.3+h/2,0,s-.22,h,s-.22);
  for(const y of [.4,h+.2])put('box','#654d3c',0,y,0,s-.12,.13,s-.12);
  for(const x of [-s*.42,s*.42])for(const z of [-s*.42,s*.42])put('box','#654d3c',x,.3+h/2,z,.15,h+.1,.15);
  put('roof','#426d5c',0,h+.95,0,s+.45,1.25,s+.5);put('roof','#e0e9dc',0,h+1.15,0,s+.18,1.02,s+.4);
  put('box','#6e5544',0,.8,s*.46,.45,1.1,.1);put('box','#c3ac75',0,.3,s*.55,.65,.16,.4);
  for(const x of [-s*.29,s*.29]){put('box','#654d3c',x,1,s*.46,.49,.63,.09);put('box','#ffcf78',x,1,s*.49,.36,.49,.04);put('box','#654d3c',x,1,s*.52,.04,.52,.03);put('box','#654d3c',x,1,s*.52,.38,.035,.03);}
  put('box','#8a8277',s*.25,h+1.1,-s*.2,.32,1.4,.38);put('box','#d6dfd4',s*.25,h+1.83,-s*.2,.45,.16,.51);
  for(let i=0;i<7;i++)put('sphere',i%2?'#ffcf78':'#af4545',-s*.43+i*s*.143,h+.35,s*.55,.09,.12,.09);
  if(workshop){put('roof','#b55c45',-.65,h+1.2,.3,.85,.65,.7);put('box','#ffcf78',-.65,h+1.08,.65,.35,.35,.03);for(let i=0;i<3;i++){put('box',i%2?'#ad4847':'#457a60',s*.55,.5+i*.17,-.4+i*.4,.5,.5,.5);put('box','#e8c479',s*.55,.5+i*.17,-.4+i*.4,.52,.07,.52);}}
  if(b.kind==='store'||b.kind==='lumber'){for(let i=0;i<4;i++)put('cylinder','#aa8050',s*.57,.36+i*.14,-.45+i%2*.35,.25,.9,.25,0,Math.PI/2);}
  if(b.kind==='sawmill'){put('cylinder','#657b78',s*.53,.8,0,.7,.1,.7,0,Math.PI/2);for(let i=0;i<5;i++)put('box','#a88456',s*.6,.3+i*.1,.6,.55,.08,.7);}
  if(b.kind==='quarry')for(let i=0;i<4;i++)put('rock','#a5b5ad',s*.55,.35+i*.13,-.5+i*.3,.6,.6,.6,i);
  // Slow, soft smoke puffs rather than stacked voxel cubes.
  for(let i=0;i<3;i++){const t=(clock*.24+i*.65)%2;put('sphere','#bac6c0',s*.25+t*.3,h+2+t,-s*.2,.18+t*.22,.23+t*.22,.18+t*.22);}
 }else{
  put('cylinder','#9dafa7',0,.65,0,.9,1,.9);put('cylinder','#d4ddcc',0,1.2,0,1.08,.2,1.08);
  if(b.kind==='nutcracker'){put('cylinder','#a54c42',0,1.65,0,.45,.7,.45);put('sphere','#d9b78e',0,2.12,0,.4,.4,.4);put('cylinder','#254940',0,2.45,0,.45,.42,.45);put('sphere','#ffcf78',0,2.48,.23,.1,.1,.06);put('box','#dec68f',0,1.7,.24,.35,.05,.04);put('cylinder','#6b5641',.3,1.7,0,.1,.9,.1);}
  if(b.kind==='snowglobe'){put('sphere','#a7d8d5',0,1.65,0,.85,.85,.85);put('cone','#e8eee1',0,1.7,0,.3,.5,.3);put('sphere','#b6f6f1',0,2.2,0,.2,.2,.2);}
  if(b.kind==='jackbox'){put('box','#a25150',0,1.5,0,.7,.5,.7);put('cylinder','#535b57',0,1.9,0,.35,.7,.35,0,-.6);put('box','#e2bc68',0,1.5,.36,.1,.5,.04);}
 }
 if(b.level>1)for(const x of [-s*.45,s*.45])put('sphere','#ffcf78',x,1.7,s*.5,.15,.15,.15);
 return v;
}
function actors(g:Game){const v:Part[]=[];
 const person=(x:number,z:number,col:string,hat:string,phase:number,walking:boolean,santa=false,carrying=false)=>{const y=heightAt(x,z),bob=walking?Math.sin(phase)*.04:0;const p=(shape:Shape,c:string,dx:number,dy:number,dz:number,w:number,h:number,d:number,rz=0)=>add(v,shape,c,x+dx,y+dy+bob,z+dz,w,h,d,0,rz);
 for(const side of [-1,1]){p('cylinder','#344f48',side*.12,.23,walking?Math.sin(phase+side)*.1:0,.13,.4,.14,walking?Math.sin(phase)*side*.2:0);p('box','#41433e',side*.12,.08,.08,.17,.13,.26);p('cylinder',col,side*.25,.64,0,.14,.42,.14,side*.22);p('sphere','#e4bd95',side*.29,.45,0,.14,.14,.14);}
 p('cone',col,0,.65,0,.58,.65,.47);p('sphere','#e4bd95',0,1.05,0,.36,.38,.35);p('cone',hat,0,1.39,0,.48,.44,.48);p('sphere','#f0eee1',0,1.62,0,.13,.13,.13);p('cylinder','#e8dfba',0,.47,0,.5,.07,.43);p('sphere','#263f38',-.07,1.08,.17,.04,.04,.04);p('sphere','#263f38',.07,1.08,.17,.04,.04,.04);
 if(santa){p('sphere','#f2eee0',0,.94,.17,.35,.3,.25);p('cylinder','#e1ca83',.43,.8,0,.07,1.45,.07);p('sphere','#ffcf78',.43,1.55,0,.2,.2,.2);}if(carrying)p('box','#a98250',0,.75,.4,.45,.4,.4);
 };
 for(const e of g.elves)person(e.x,e.z,'#438d72','#477d56',g.elapsed*9+e.id,e.path.length>0,false,Object.values(e.cargo).some(n=>n>0));
 if(g.santa.recovering<=0)person(g.santa.x,g.santa.z,'#af4146','#b64f46',g.elapsed*8,g.santa.path.length>0,true);
 for(const t of g.troops){if(t.kind==='artillery'){const y=heightAt(t.x,t.z);add(v,'box','#a54e47',t.x,y+.5,t.z,.8,.5,1.1);for(const dx of [-.5,.5])for(const dz of [-.35,.35])add(v,'cylinder','#54594b',t.x+dx,y+.3,t.z+dz,.45,.15,.45,0,Math.PI/2);add(v,'cylinder','#d0b475',t.x,y+.95,t.z,.3,1,.3,0,-.5);}else person(t.x,t.z,t.kind==='infantry'?'#ad4d42':'#6a99a5',t.kind==='infantry'?'#294c45':'#d7e5dc',g.elapsed*9+t.id,t.path.length>0);}
 for(const e of g.enemies){const y=heightAt(e.x,e.z),king=e.clan==='king',scale=king?1.8:1;add(v,'cone',e.clan==='witch'?'#61466f':'#645144',e.x,y+.5*scale,e.z,.7*scale,1*scale,.65*scale);add(v,'sphere',e.clan==='pumpkin'||king?'#cd7a32':e.clan==='witch'?'#a0b58b':'#d1cab0',e.x,y+1.1*scale,e.z,.65*scale,.6*scale,.6*scale);for(const dx of [-.14,.14])add(v,'box','#ffcf78',e.x+dx*scale,y+1.15*scale,e.z+.29*scale,.12*scale,.1*scale,.03);if(e.clan==='witch'){add(v,'cylinder','#383347',e.x,y+1.43,e.z,.95,.1,.95);add(v,'cone','#44394f',e.x,y+1.78,e.z,.6,.7,.6);}if(king)for(let i=0;i<5;i++)add(v,'cone','#d3b260',e.x+Math.sin(i*1.25)*.45,y+2.6,e.z+Math.cos(i*1.25)*.45,.25,.7,.25);}
 for(const a of [...g.troops,...g.enemies])if(a.hp<a.maxHp){const y=heightAt(a.x,a.z)+(('clan'in a&&a.clan==='king')?3.2:1.95),fraction=Math.max(0,a.hp/a.maxHp);add(v,'box','#324f4a',a.x,y,a.z,.8,.065,.1,Math.PI/4);add(v,'box',('clan'in a)?'#d7a078':'#b3d7aa',a.x-(1-fraction)*.28,y+.012,a.z+(1-fraction)*.28,.8*fraction,.067,.11,Math.PI/4);}
 return v;
}
function landmarks(g:Game){const v:Part[]=[];for(const d of g.deposits){if(d.amount<=0)continue;if(d.resource==='wood'){for(let i=0;i<5;i++)pine(v,d.x+Math.sin(i*1.3)*1.2,d.z+Math.cos(i*1.3)*1.2,2.3+i*.25,true);}else for(let i=0;i<5;i++)add(v,'rock','#acbcb6',d.x+Math.sin(i)*.8,heightAt(d.x,d.z)+.4+i*.1,d.z+Math.cos(i)*.8,1.4,1.4,1.3,i);}
 for(const s of g.shrines){const y=heightAt(s.x,s.z);add(v,'cylinder','#a4b2aa',s.x,y+.15,s.z,2.4,.3,2.4);add(v,'cylinder',s.restored?'#c9b981':'#776b8c',s.x,y+1,s.z,.5,1.6,.5);add(v,'rock',s.restored?'#ffcf78':'#b6f6f1',s.x,y+2,s.z,.8,1,.8);for(let i=0;i<6;i++)add(v,'cylinder','#a7b4aa',s.x+Math.sin(i)*1,y+.5,s.z+Math.cos(i)*1,.15,.8,.15);}
 for(const c of g.camps){const y=heightAt(c.x,c.z);if(c.cleared){add(v,'cylinder','#8c7552',c.x,y+1.5,c.z,.12,3,.12);add(v,'box','#4a9970',c.x+.5,y+2.7,c.z,1,.6,.05);continue;}add(v,'cylinder','#625464',c.x,y+.2,c.z,4,.4,4);add(v,'cone',c.clan==='pumpkin'?'#9a5b38':c.clan==='witch'?'#665078':'#858477',c.x,y+1.7,c.z,3,3,3);add(v,'cone','#3d3848',c.x,y+3.4,c.z,3.6,2.3,3.6);add(v,'sphere','#ffcf78',c.x,y+1.5,c.z+1.4,.5,.65,.1);for(let i=0;i<8;i++){const x=c.x+Math.sin(i)*3,z=c.z+Math.cos(i)*3;add(v,'cone','#6c5551',x,y+.7,z,.3,1.8,.3);}}
 return v;
}
function Camera({focus,target}:{focus:number;target:Point}){const ref=useRef<Controls>(null),{camera,size}=useThree(),initial=useRef(false),t=useRef(target);t.current=target;useEffect(()=>{if(!initial.current){camera.zoom=Math.max(7,Math.min(size.width/46,size.height/35));camera.updateProjectionMatrix();initial.current=true;}},[camera,size]);useEffect(()=>{if(!ref.current)return;const v=new Vector3(t.current.x,0,t.current.z),delta=v.clone().sub(ref.current.target);camera.position.add(delta);ref.current.target.copy(v);ref.current.update();},[focus,camera]);useFrame(()=>{if(!ref.current)return;const p=ref.current.target;const x=Math.max(-27,Math.min(27,p.x)),z=Math.max(-26,Math.min(26,p.z));camera.position.x+=x-p.x;camera.position.z+=z-p.z;p.set(x,0,z);});return <OrbitControls ref={ref} makeDefault enableRotate={false} enableDamping dampingFactor={.15} minZoom={6} maxZoom={55} mouseButtons={{LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.PAN}} touches={{ONE:TOUCH.PAN,TWO:TOUCH.DOLLY_PAN}}/>;}
function Water(){const ref=useRef<Group>(null);useFrame(({clock})=>{if(ref.current)ref.current.position.y=Math.sin(clock.elapsedTime*.7)*.025;});const points=useMemo(()=>Array.from({length:57},(_,i)=>({z:i-28,x:riverX(i-28)})),[]);return <group ref={ref}>{points.map(p=><mesh key={p.z} position={[p.x,-.1,p.z]} rotation={[-Math.PI/2,0,0]} raycast={noop}><planeGeometry args={[2.7,1.1]}/><meshStandardMaterial color="#6caaad" metalness={.3} roughness={.22}/></mesh>)}</group>;}
export type WorldProps={g:Game;build:Kind|null;hover:Point|null;rotation:number;onHover:(p:Point)=>void;onTile:(p:Point)=>void;focus:number;cameraTarget:Point;reduced:boolean;selected:number[];selectedBuilding:number|null;onPerformance:(fps:number)=>void};
function Scene({g,build,hover,rotation,onHover,onTile,focus,cameraTarget,reduced,selected,selectedBuilding,onPerformance}:WorldProps){
 const ground=useMemo(terrain,[]),land=useMemo(()=>landscape(g),[]); // immutable landscape seed
 const buildings=useMemo(()=>g.buildings.flatMap(b=>buildingParts(b,reduced?0:g.elapsed)),[g,reduced]);const figures=actors(g),marks=landmarks(g),night=g.phase==='night'||g.phase==='lost';const down=useRef<{x:number;y:number}|null>(null);const timing=useRef({seconds:0,frames:0});useFrame((_,dt)=>{timing.current.seconds+=dt;timing.current.frames++;if(timing.current.seconds>=2){onPerformance(Math.round(timing.current.frames/timing.current.seconds));timing.current={seconds:0,frames:0};}});const fingers=useRef(new Set<number>()),multi=useRef(false);
 useEffect(()=>{const release=(e:PointerEvent)=>{fingers.current.delete(e.pointerId);if(!fingers.current.size){multi.current=false;down.current=null;}};window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);};},[]);useEffect(()=>()=>ground.dispose(),[ground]);const point=(e:ThreeEvent<PointerEvent>)=>({x:Math.round(e.point.x),z:Math.round(e.point.z)});
 const pointerDown=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();fingers.current.add(e.pointerId);if(fingers.current.size>1)multi.current=true;down.current={x:e.clientX,y:e.clientY};};
 const pointerUp=(e:ThreeEvent<PointerEvent>,p?:Point)=>{e.stopPropagation();if(!multi.current&&down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)<7)onTile(p??point(e));fingers.current.delete(e.pointerId);if(!fingers.current.size)multi.current=false;down.current=null;};
 return <>
 <color attach="background" args={[night?'#101d32':'#a9c8cd']}/><fog attach="fog" args={[night?'#101d32':'#a9c8cd',65,135]}/>
 <ambientLight intensity={night?.65:1.15} color={night?'#8ca5dc':'#ffecd2'}/><hemisphereLight args={['#c9e9f1','#596551',night?.5:1.3]}/>
 <directionalLight position={[-18,35,12]} intensity={night?.7:3} color={night?'#a0bbed':'#ffe0af'} castShadow={!reduced} shadow-mapSize={[2048,2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-normalBias={.04}/>
 <Camera focus={focus} target={cameraTarget}/><mesh geometry={ground} receiveShadow onPointerDown={pointerDown} onPointerMove={e=>build&&onHover(point(e))} onPointerUp={e=>pointerUp(e)} onPointerCancel={()=>{fingers.current.clear();multi.current=false;down.current=null;}}><meshStandardMaterial vertexColors roughness={1}/></mesh>
 <Water/><Models parts={land}/><Models parts={buildings} night={night}/><Models parts={figures} night={night} smooth={!reduced}/><Models parts={marks} night={night}/>
 {!build&&g.buildings.filter(b=>b.kind!=='road').map(b=><mesh key={b.id} position={[centre(b).x,heightAt(b.x,b.z)+1,centre(b).z]} onPointerDown={pointerDown} onPointerUp={e=>pointerUp(e,{x:b.x,z:b.z})}><boxGeometry args={[sizeOf(b),2.8,sizeOf(b)]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
 {g.buildings.filter(b=>b.kind==='hearth'||b.kind==='workshop').slice(0,reduced?2:5).map(b=><group key={`light${b.id}`}>{night&&<><pointLight position={[centre(b).x,2.3,centre(b).z]} color="#ffba65" intensity={35} distance={11} decay={1.6}/><mesh position={[centre(b).x,heightAt(b.x,b.z)+.05,centre(b).z]} rotation={[-Math.PI/2,0,0]} raycast={noop}><circleGeometry args={[5,40]}/><meshBasicMaterial color="#ffcd80" transparent opacity={.07} depthWrite={false}/></mesh></>}</group>)}
 {[g.santa,...g.troops.filter(t=>selected.includes(t.id))].map((a,i)=><mesh key={`ring${i}`} position={[a.x,heightAt(a.x,a.z)+.07,a.z]} rotation={[-Math.PI/2,0,0]} raycast={noop}><ringGeometry args={[.52,.62,24]}/><meshBasicMaterial color={i===0?'#f5d594':'#aef0d2'}/></mesh>)}
 {selectedBuilding!==null&&g.buildings.filter(b=>b.id===selectedBuilding).map(b=><mesh key="selection" position={[centre(b).x,heightAt(b.x,b.z)+.08,centre(b).z]} rotation={[-Math.PI/2,0,0]} raycast={noop}><ringGeometry args={[sizeOf(b)*.75,sizeOf(b)*.75+.08,40]}/><meshBasicMaterial color="#eedaac"/></mesh>)}
 {build&&hover&&onIsland(hover.x,hover.z)&&<mesh position={[hover.x+(CATALOG[build].size-1)/2,heightAt(hover.x,hover.z)+.12,hover.z+(CATALOG[build].size-1)/2]} rotation={[0,rotation*Math.PI/2,0]} raycast={noop}><boxGeometry args={[CATALOG[build].size,.15,CATALOG[build].size]}/><meshBasicMaterial color={placementError(g,build,hover.x,hover.z)?'#ed8179':'#9ee8bd'} transparent opacity={.65}/></mesh>}
 {g.effects.map(e=>{const t=1-e.life/e.total;return <mesh key={e.id} position={[e.from.x+(e.to.x-e.from.x)*t,1+heightAt(e.to.x,e.to.z)+Math.sin(t*Math.PI)*2,e.from.z+(e.to.z-e.from.z)*t]} raycast={noop}><sphereGeometry args={[.12,6,4]}/><meshBasicMaterial color={e.color}/></mesh>;})}
 {g.santa.shield>0&&<mesh position={[g.santa.x,1,g.santa.z]} raycast={noop}><sphereGeometry args={[7,24,12]}/><meshBasicMaterial color="#bce9ed" transparent opacity={.07} wireframe/></mesh>}
 </>;
}
export default function World(props:WorldProps){return <Canvas shadows={props.reduced?false:{type:PCFShadowMap}} orthographic camera={{position:[38,43,38],zoom:18,near:.1,far:180}} dpr={props.reduced?1:[1,1.5]} gl={{antialias:true,powerPreference:'high-performance'}}><Scene {...props}/></Canvas>;}
