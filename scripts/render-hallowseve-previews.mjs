/** Offline portraits from the exact geometry used by the game. No remote code/assets. */
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {moduleUrl} from './rally-test-loader.mjs';
const {buildingParts,roofGeometry,actors}=await import(await moduleUrl(resolve('components/hallowseve26/models.ts')));
const {CATALOG,TROOPS}=await import(await moduleUrl(resolve('components/hallowseve26/simulation.ts')));
const shapes={box:new T.BoxGeometry(),cone:new T.ConeGeometry(.5,1,8),cylinder:new T.CylinderGeometry(.5,.5,1,10),sphere:new T.SphereGeometry(.5,10,8),rock:new T.IcosahedronGeometry(.5,0),roof:roofGeometry()};
const view=new T.Vector3(8,6,10).normalize(),right=new T.Vector3(10,0,-8).normalize(),up=new T.Vector3().crossVectors(view,right).normalize(),light=new T.Vector3(-3,8,6).normalize();
await mkdir('public/hallowseve26/previews',{recursive:true});
for(const kind of [...Object.keys(CATALOG),...Object.keys(TROOPS)]){
 const parts=CATALOG[kind]?buildingParts({kind,x:0,z:0,rotation:0,level:1,progress:1},0):actors({elapsed:0,elves:[],enemies:[],santa:{recovering:1},troops:[{kind,x:0,z:0,id:1,path:[],hp:1,maxHp:1}]}),triangles=[];
 for(const p of parts){const geometry=shapes[p.shape],positions=geometry.attributes.position,indices=geometry.index,object=new T.Object3D();object.position.set(p.x,p.y,p.z);object.rotation.set(p.rx??0,p.ry,p.rz);object.scale.set(p.w,p.h,p.d);object.updateMatrix();
 for(let i=0;i<(indices?.count??positions.count);i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j).applyMatrix4(object.matrix));const normal=new T.Vector3().subVectors(points[1],points[0]).cross(new T.Vector3().subVectors(points[2],points[0])).normalize();if(normal.dot(view)<=0)continue;const color=new T.Color(p.color).multiplyScalar(.62+Math.max(0,normal.dot(light))*.48);triangles.push({points:points.map(v=>[v.dot(right),-v.dot(up)]),depth:points.reduce((n,v)=>n+v.dot(view),0)/3,color:'#'+color.getHexString()});}}
 const all=triangles.flatMap(t=>t.points),minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));const scale=Math.min(260/(maxX-minX),210/(maxY-minY)),cx=(maxX+minX)/2,cy=(maxY+minY)/2;
 const polys=triangles.sort((a,b)=>a.depth-b.depth).map(t=>`<polygon points="${t.points.map(([x,y])=>`${((x-cx)*scale+160).toFixed(2)},${((y-cy)*scale+125).toFixed(2)}`).join(' ')}" fill="${t.color}" stroke="${t.color}" stroke-width=".35"/>`).join('');
 await writeFile(`public/hallowseve26/previews/${kind}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 250"><title>${(CATALOG[kind]??TROOPS[kind]).name}</title><ellipse cx="160" cy="226" rx="95" ry="12" fill="#102c35" opacity=".18"/>${polys}</svg>`);
}
