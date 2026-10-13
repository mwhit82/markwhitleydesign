import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {miniatureTrees} from './miniature';
import type {StageSelection} from './stages';
/** Static, instanced scenery. No extra lights, reflection passes or frame updates. */
export function specialScenery(s:StageSelection,points:T.Vector3[],reserved:(x:number,z:number)=>boolean){
 const group=new T.Group(),neon=s.stage==='neon',dummy=new T.Object3D();group.name='special-stage-scenery';
 const clear=(x:number,z:number,r=12)=>!reserved(x,z)&&points.every(p=>Math.hypot(p.x-x,p.z-z)>r);
 const batch=(name:string,geo:T.BufferGeometry,mat:T.Material,items:{x:number;y:number;z:number;w:number;h:number;d:number;color?:string}[])=>{const m=new T.InstancedMesh(geo,mat,items.length);m.name=name;items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(p.color)m.setColorAt(i,new T.Color(p.color));});m.castShadow=true;m.receiveShadow=true;group.add(m);};
 if(neon){
  const buildings:Parameters<typeof batch>[3]=[],windows:Parameters<typeof batch>[3]=[],signs:Parameters<typeof batch>[3]=[];
  for(let x=-76;x<=76;x+=14)for(let z=-70;z<=70;z+=14){if(!clear(x,z,15))continue;const clearance=Math.min(...points.map(p=>Math.hypot(p.x-x,p.z-z)));const h=Math.min(9+Math.abs(Math.sin(x*3.17+z*1.13))*20,Math.max(4,(clearance-7)*.65));buildings.push({x,y:h/2,z,w:10,h,d:10,color:['#424659','#55516b','#3b5260'][Math.abs(Math.round(x+z))%3]});for(let y=3;y<h-1;y+=3){windows.push({x,y,z:z+5.08,w:7,h:.55,d:.08,color:y%2?'#67d8d2':'#d778ce'});windows.push({x:x+5.08,y,z,w:.08,h:.55,d:7,color:'#739fe3'});}signs.push({x:x-5.12,y:5,z,w:.12,h:5,d:2,color:'#dc79da'});}
  batch('clay-city',new RoundedBoxGeometry(1,1,1,1,.035),new T.MeshStandardMaterial({color:'white',roughness:.8}),buildings);
  batch('neon-windows',new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'white',emissive:'#65cbc9',emissiveIntensity:.8,roughness:.7}),windows);
  batch('neon-signs',new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'white',emissive:'#d565c3',emissiveIntensity:1.1}),signs);
  const rails:Parameters<typeof batch>[3]=[];for(let i=8;i<640;i+=8){const p=points[i],d=points[i+1].clone().sub(p).normalize();for(const side of [-1,1]){const x=p.x+d.z*7.6*side,z=p.z-d.x*7.6*side;if(!reserved(x,z)&&points.every(q=>Math.hypot(q.x-x,q.z-z)>6.5))rails.push({x,y:.65,z,w:.45,h:1.3,d:.45,color:side>0?'#7bdddb':'#c986dc'});}}
  batch('route-beacons',new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'white',emissive:'#7ccfdc',emissiveIntensity:.5}),rails);
 }else{
  const trees:{x:number;z:number;h:number}[]=[],hills:Parameters<typeof batch>[3]=[],stones:Parameters<typeof batch>[3]=[];
  for(let i=0;i<160;i++){const x=Math.sin(i*17.3)*77,z=Math.cos(i*9.7)*72;if(!clear(x,z,13))continue;trees.push({x,z,h:3+(i%5)});if(i%5===0&&clear(x,z,22))hills.push({x,y:-.6,z,w:14,h:7+(i%3)*2,d:13,color:'#6b7d4f'});else stones.push({x,y:.4,z,w:1.5,h:1,d:1.2,color:'#8c8771'});}
  group.add(miniatureTrees(trees,false));batch('distant-earth',new T.IcosahedronGeometry(1,2),new T.MeshStandardMaterial({color:'white',roughness:1}),hills);batch('clay-stones',new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'white',roughness:1}),stones);
 }
 return group;
}