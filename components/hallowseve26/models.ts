import {characterParts} from './character-model';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {centre,sizeOf,heightAt,type Game,type Building} from './simulation';
export type Shape='box'|'cone'|'cylinder'|'sphere'|'rock'|'roof';
export type Part={shape:Shape;color:string;x:number;y:number;z:number;w:number;h:number;d:number;ry:number;rz:number};
export const add=(v:Part[],shape:Shape,color:string,x:number,y:number,z:number,w:number,h:number,d:number,ry=0,rz=0)=>v.push({shape,color,x,y,z,w,h,d,ry,rz});
export function roofGeometry(){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-.5,-.5,-.5,.5,-.5,-.5,0,.5,-.5, -.5,-.5,.5,0,.5,.5,.5,-.5,.5, -.5,-.5,-.5,0,.5,-.5,0,.5,.5, -.5,-.5,-.5,0,.5,.5,-.5,-.5,.5, .5,-.5,-.5,.5,-.5,.5,0,.5,.5, .5,-.5,-.5,0,.5,.5,0,.5,-.5, -.5,-.5,-.5,-.5,-.5,.5,.5,-.5,.5, -.5,-.5,-.5,.5,-.5,.5,.5,-.5,-.5],3));g.computeVertexNormals();return g;}
export function buildingParts(b:Building,clock:number){const v:Part[]=[],c=centre(b),s=sizeOf(b),base=heightAt(c.x,c.z),angle=b.rotation*Math.PI/2;const put=(shape:Shape,col:string,x:number,y:number,z:number,w:number,h:number,d:number,ry=0,rz=0)=>{const co=Math.cos(angle),si=Math.sin(angle);add(v,shape,col,c.x+x*co+z*si,base+y,c.z+z*co-x*si,w,h,d,ry+angle,rz);};
 if(b.kind==='road'){put('box','#a6a79a',0,.035,0,.98,.07,.98);for(const z of [-.25,.25])for(const x of [-.25,.25])put('box','#c3c2ae',x,.08,z,.44,.05,.43);return v;}
 put('box','#8d9b99',0,.15,0,s+.1,.3,s+.1);
 if(b.progress<1){
  const stage=Math.min(4,Math.floor(b.progress*5)),full=buildingParts({...b,progress:1},0),highest=Math.max(...full.map(p=>p.y+p.h/2))-base;
  const limit=base+highest*([.12,.3,.6,.88,1][stage]);
  for(const p of full)if(p.y+p.h/2<=limit&&p.color!=='#bac6c0')v.push(p);
  for(const dx of [-1,1])for(const dz of [-1,1])put('cylinder','#a98050',dx*s*.52,highest*.45,dz*s*.52,.1,highest*.9,.1);
  for(const y of [.6,1.4,2.2].filter(y=>y<highest))for(const z of [-s*.52,s*.52]){put('box','#c1a06b',0,y,z,s+.3,.1,.18);put('box','#956d44',0,y+.35,z,s+.3,.07,.08);}
  if(stage>=1)for(const x of [-s*.4,s*.4])put('box','#805b3e',x,highest*.35,0,.15,highest*.6,s*.8);
  for(let i=0;i<3;i++)put('box','#c59657',s*.6,.22+i*.12,0,.4,.1,.8);
  if(stage===4)for(let i=0;i<4;i++){const t=(clock+i*.2)%1;put('sphere','#ffe6a6',Math.sin(i*1.7)*s*.5,highest*.7+t*.6,Math.cos(i*1.7)*s*.5,.07,.07,.07);}
  return v;
 }
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

export function actors(g:Game){const v:Part[]=[];for(const a of [...g.troops,...g.enemies.map(e=>({...e,kind:e.clan})),...g.elves.map(e=>({...e,kind:'elf' as const})),...(g.santa.recovering<=0?[{...g.santa,kind:'santa' as const}]:[])])for(const p of characterParts(a.kind)){if(p.joint==='cargo')continue;v.push({...p,x:p.x+a.x,y:p.y+heightAt(a.x,a.z),z:p.z+a.z});}return v;}
