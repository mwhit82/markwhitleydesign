import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {internationalFlags} from './rally-effects';
import {kartFinishLayout} from "./kart-venue";
import type {StageSelection} from "./stages";
import * as T from 'three';
// Choose a service area beyond the gate without covering another part of the route.
export function finishLayout(points:T.Vector3[]) {
 const finish=points[points.length-1].clone();
 const direction=finish.clone().sub(points[points.length-8]).normalize();
 const exit=finish.clone().addScaledVector(direction,8);
 let best:{center:T.Vector3;angle:number;approach:T.QuadraticBezierCurve3;cost:number}|undefined;
 for(const distance of [24,28,32,36,40,44,48])for(const degrees of [0,15,-15,30,-30,45,-45,60,-60,75,-75,90,-90,105,-105,120,-120]){
  const heading=direction.clone().applyAxisAngle(new T.Vector3(0,1,0),degrees*Math.PI/180);
  const center=finish.clone().addScaledVector(heading,distance);
  const angle=Math.atan2(center.x-exit.x,center.z-exit.z),sin=Math.sin(angle),cos=Math.cos(angle);
  // Distance to the full 17 x 18 apron, including the road's half-width and a verge.
  if(points.some(p=>{const x=p.x-center.x,z=p.z-center.z;return Math.hypot(Math.max(0,Math.abs(x*cos-z*sin)-8.5),Math.max(0,Math.abs(x*sin+z*cos)-9))<8;}))continue;
  const approach=new T.QuadraticBezierCurve3(finish,exit,center);
  if(approach.getPoints(40).some(p=>points.slice(points[0].distanceTo(finish)<1?35:0,-35).some(q=>p.distanceTo(q)<8)))continue;
  const cost=distance+Math.abs(degrees)*.16;
  if(!best||cost<best.cost)best={center,angle,approach,cost};
 }
 if(!best)throw new Error('No clear finish service area for this route');
 return {finish,direction,center:best.center,angle:best.angle,approach:best.approach};
}
// Fast retreat begins more than two seconds ahead at top speed; no crowd collisions.
export function fanProgress(current:number,travel:number,distance:number,speed:number,dt:number,wantsRoad:boolean){
 const danger=distance<Math.max(30,speed*2.5+15);
 const target=wantsRoad&&!danger?1:0;
 if(distance<14)return 0;
 const step=(target?2:12)*dt/Math.max(1,travel);
 return target?Math.min(1,current+step):Math.max(0,current-step);
}
export class Atmosphere {
 group=new T.Group();
 layout:ReturnType<typeof finishLayout>|ReturnType<typeof kartFinishLayout>;
 private people:T.InstancedMesh;
 private arms:T.InstancedMesh;
 private flashes:T.InstancedMesh;
 private cameras:T.InstancedMesh;
 private confetti:T.InstancedMesh;
 private floor:T.InstancedMesh;
 private spectators:{x:number;z:number;angle:number;photo:boolean;road:T.Vector3;excursion:number;progress:number;finish:boolean;camera:number}[]=[];
 private clock=0;
 private reservedPath:T.Vector3[];
 private dummy=new T.Object3D();
 private burst=-1;
 private roofs:T.Mesh[]=[];
 reduced=typeof matchMedia!=='undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(points:T.Vector3[],selection?:StageSelection) {
  const kart=selection?.stage==='kart',city=selection?.stage==='nyc';
  this.layout=kart?kartFinishLayout(points,selection):finishLayout(points);
  this.reservedPath=this.layout.approach.getPoints(24);
  const {center,angle}=this.layout;
  const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.9});
  const box=(w:number,h:number,d:number,color:string,x:number,y:number,z:number,parent=this.group)=>{
   const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.15,w*.15,h*.15,d*.15)),mat(color));mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const tent=new T.Group();tent.position.copy(center);tent.rotation.y=angle;this.group.add(tent);
  box(17,.12,18,kart||city?'#4e555b':'#cfbd92',0,.02,0,tent);
  const approach=Array.from({length:81},(_,i)=>this.layout.approach.getPointAt(i/80)),vertices:number[]=[],indices:number[]=[];
  approach.forEach((p,i)=>{const tangent=this.layout.approach.getTangentAt(i/80),right=new T.Vector3(tangent.z,0,-tangent.x).normalize().multiplyScalar(kart?4:5.6);vertices.push(p.x-right.x,p.y+.075,p.z-right.z,p.x+right.x,p.y+.075,p.z+right.z);if(i<80){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}});
  const laneGeometry=new T.BufferGeometry();laneGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));laneGeometry.setIndex(indices);laneGeometry.computeVertexNormals();
  const lane=new T.Mesh(laneGeometry,mat(kart||city?'#4e555b':'#cfbd92'));lane.receiveShadow=true;this.group.add(lane);
  if(city){
   for(const x of [-6,6])for(const z of [-5,5])box(.6,6,.6,'#e7dfc8',x,3,z,tent);
   const roof=box(16,.7,15,'#d95637',0,6,0,tent);this.roofs.push(roof);box(16,.3,15,'#eee4c9',0,5.6,0,tent);
   for(const x of [-6,6])for(const z of [-3,3]){box(1,1.8,.8,'#eee4c9',x,.9,z,tent);box(.7,.5,.85,'#2e4445',x,1.35,z,tent);box(.15,1.2,.2,'#242e2b',x+.6,.8,z,tent);}
   box(6,3,7,'#ac9980',11,1.5,0,tent);
  }else{
  for(const x of [-5,5])for(const z of [-4,4])box(.22,4.8,.22,'#f7eed8',x,2.4,z,tent);
  for(const side of [-1,1]) {const roof=box(5.6,.18,9.6,'#df5838',side*2.55,5.35,0,tent);roof.rotation.z=-side*.3;this.roofs.push(roof);}
  box(10.6,.6,.18,'#fff0d0',0,4.65,4.5,tent);
  }
  // Shared geometry/material and instancing keep crowd and confetti draw calls bounded.
  this.people=new T.InstancedMesh(new T.SphereGeometry(.5,7,5),mat('#f2d3ad'),72*3);
  this.arms=new T.InstancedMesh(new T.CapsuleGeometry(.11,.48,2,5),mat('#416b85'),144);
  this.flashes=new T.InstancedMesh(new T.SphereGeometry(.2,5,3),new T.MeshBasicMaterial({color:'#fffbdc'}),24);
  const camera=this.cameras=new T.InstancedMesh(new RoundedBoxGeometry(.48,.32,.28,1,.045),mat('#343d3b'),24);
  const colors=['#dd593c','#3478a0','#e5b93f','#677f53','#a572a1','#eee9d8'];
  let count=0,photoCount=0;
  for(const [section,index] of [90,210,340,480,560,600,640,640,640,640,640,640].entries()) {
   const finish=section>=6,u=kart?.85+(section-6)*.025:.25+(section-6)*.13;
   const p=finish?this.layout.approach.getPointAt(u):points[index],dir=finish?this.layout.approach.getTangentAt(u):points[Math.min(index+3,650)].clone().sub(points[index-3]).normalize();
   const right=new T.Vector3(dir.z,0,-dir.x);
   for(let j=0;j<6;j++) {
    let chosen:T.Vector3|null=null;
    for(const side of [j%2?1:-1,j%2?-1:1])for(const distance of [7.8,9,11,14,18]) {
     if(chosen)break;
     const candidate=p.clone().addScaledVector(right,side*distance).addScaledVector(dir,(j-2.5)*1.4);
     if((!kart||(Math.abs(candidate.x)<114&&Math.abs(candidate.z)<114))&&points.every(q=>q.distanceTo(candidate)>7)&& (finish?this.reservedPath.every(q=>q.distanceTo(candidate)>6.8):!this.reserved(candidate.x,candidate.z))&&this.spectators.every(q=>Math.hypot(q.x-candidate.x,q.z-candidate.z)>1.1)){chosen=candidate;break;}
    }
    // Guaranteed safe fallback behind the finish spectator barrier on extended apron.
    if(!chosen){
     for(let radius=18;!chosen && radius<100;radius+=3)for(let k=0;k<72;k++){
      const candidate=center.clone().add(new T.Vector3(Math.cos(k*Math.PI/36)*radius,0,Math.sin(k*Math.PI/36)*radius));
      if((!kart||(Math.abs(candidate.x)<114&&Math.abs(candidate.z)<114))&&points.every(q=>q.distanceTo(candidate)>8.7)&&!this.reserved(candidate.x,candidate.z)&&this.spectators.every(q=>Math.hypot(q.x-candidate.x,q.z-candidate.z)>1.3)){chosen=candidate;break;}
     }
    }
    if(!chosen)continue;
    const a=Math.atan2(p.x-chosen.x,p.z-chosen.z),photo=j===4||j===5;
    const excursion=(finish||(!photo && (j===1||j===3))) && chosen.distanceTo(p)<30?1:0;
    this.spectators.push({x:chosen.x,z:chosen.z,angle:a,photo,road:p.clone().addScaledVector(dir,(j-2.5)*2),excursion,progress:finish&&!this.reduced?1:0,finish,camera:photo?photoCount++:-1});
    for(let part=0;part<3;part++) {
     this.dummy.position.set(chosen.x,part===0?.55:part===1?1.15:1.68,chosen.z);
     this.dummy.rotation.set(0,a,0);this.dummy.scale.set(part===2?.56:.66,part===2?.62:1,.6);this.dummy.updateMatrix();this.people.setMatrixAt(count*3+part,this.dummy.matrix);
     this.people.setColorAt(count*3+part,new T.Color(part===0?'#344a54':part===1?colors[count%6]:['#ecc49e','#bc8868','#805d48'][count%3]));
    }
    if(photo){this.dummy.position.set(chosen.x+Math.sin(a)*.4,1.55,chosen.z+Math.cos(a)*.4);this.dummy.rotation.set(0,a,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();camera.setMatrixAt(photoCount-1,this.dummy.matrix);}
    if(!excursion){const barrier=box(1.2,.12,.12,'#f5d8a3',chosen.x+Math.sin(a)*.7,.8,chosen.z+Math.cos(a)*.7);barrier.rotation.y=a;}
    count++;
   }
  }
  const flagPositions=this.spectators.filter((p,i)=>i%4===0).map(p=>new T.Vector3(p.x-Math.sin(p.angle)*1.5,0,p.z-Math.cos(p.angle)*1.5)).filter(p=>points.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>7)&&!this.reserved(p.x,p.z));this.group.add(internationalFlags(flagPositions));
  this.people.count=count*3;this.arms.count=count*2;this.flashes.count=photoCount;camera.count=photoCount;
  this.group.add(this.people,this.arms,this.flashes,camera);
  const paper=new T.PlaneGeometry(.17,.3),paperMat=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide});
  this.floor=new T.InstancedMesh(paper,paperMat,180);this.confetti=new T.InstancedMesh(paper,paperMat,100);
  for(let i=0;i<180;i++) {
   const x=Math.sin(i*47.2)*7,z=Math.cos(i*19.3)*8.5;
   this.dummy.position.set(center.x+x*Math.cos(angle)+z*Math.sin(angle),.14,center.z-x*Math.sin(angle)+z*Math.cos(angle));this.dummy.rotation.set(-Math.PI/2,0,i);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.floor.setMatrixAt(i,this.dummy.matrix);this.floor.setColorAt(i,new T.Color(colors[i%6]));
  }
  for(let i=0;i<100;i++)this.confetti.setColorAt(i,new T.Color(colors[i%6]));
  this.confetti.visible=false;this.group.add(this.floor,this.confetti);
 }
 crowdDistance(car:T.Vector3){let distance=Infinity;for(const p of this.spectators)distance=Math.min(distance,Math.hypot(car.x-p.x,car.z-p.z));return distance;}
 reserved(x:number,z:number) {
  const p=new T.Vector3(x,0,z);
  return p.distanceTo(this.layout.center)<15 || this.reservedPath.some(q=>p.distanceTo(q)<10);
 }

 celebrate(){this.burst=0;this.confetti.visible=!this.reduced;for(const roof of this.roofs){const material=roof.material as T.MeshStandardMaterial;material.transparent=true;material.opacity=.28;material.depthWrite=false;material.needsUpdate=true;}}
 reset(){this.clock=0;for(const p of this.spectators)p.progress=p.finish&&!this.reduced?1:0;this.burst=-1;this.confetti.visible=false;for(const roof of this.roofs){const material=roof.material as T.MeshStandardMaterial;material.transparent=false;material.opacity=1;material.depthWrite=true;material.needsUpdate=true;}}
 update(dt:number,_elapsed:number,car?:T.Vector3,speed=0,racing=false) {
  this.clock+=dt;const elapsed=this.clock;
  for(let i=0;i<this.spectators.length;i++) {
   const p=this.spectators[i];
   const travel=Math.hypot(p.road.x-p.x,p.road.z-p.z);
   const distance=car?Math.min(car.distanceTo(p.road),Math.hypot(car.x-p.x,car.z-p.z)):0;
   if(distance>65&&p.progress===0&&this.clock>1)continue;
   p.progress=this.reduced?0:fanProgress(p.progress,travel,distance,Math.abs(speed),dt,Boolean(p.excursion)&&racing&&!this.reduced&&(p.finish||(elapsed+i*1.7)%16<6));
   const x=T.MathUtils.lerp(p.x,p.road.x,p.progress),z=T.MathUtils.lerp(p.z,p.road.z,p.progress);
   const bounce=!this.reduced&&distance<26?Math.max(0,Math.sin(elapsed*7+i))*.3:0;
   for(let part=0;part<3;part++){
    this.dummy.position.set(x,(part===0?.55:part===1?1.15:1.68)+bounce,z);
    this.dummy.rotation.set(0,p.angle,0);this.dummy.scale.set(part===2?.56:.66,part===2?.62:1,.6);this.dummy.updateMatrix();this.people.setMatrixAt(i*3+part,this.dummy.matrix);
   }
   for(let side=0;side<2;side++) {
    const offset=side===0?-.43:.43;
    this.dummy.position.set(x+Math.cos(p.angle)*offset,1.3+bounce,z-Math.sin(p.angle)*offset);
    this.dummy.rotation.set(0,p.angle,p.photo?-.8:(side===0?-1:1)*(1.7+(this.reduced?0:Math.sin(elapsed*3+i)*.25)));this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.arms.setMatrixAt(i*2+side,this.dummy.matrix);
   }
   if(p.photo){this.dummy.position.set(x+Math.sin(p.angle)*.4,1.55+bounce,z+Math.cos(p.angle)*.4);this.dummy.rotation.set(0,p.angle,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.cameras.setMatrixAt(p.camera,this.dummy.matrix);this.dummy.position.add(new T.Vector3(Math.sin(p.angle)*.2,0,Math.cos(p.angle)*.2));this.dummy.scale.setScalar(!this.reduced&&distance<35&&(elapsed+i*.71)%3.8<.07?1:0);this.dummy.updateMatrix();this.flashes.setMatrixAt(p.camera,this.dummy.matrix);}
  }
  this.people.instanceMatrix.needsUpdate=true;this.arms.instanceMatrix.needsUpdate=true;this.flashes.instanceMatrix.needsUpdate=true;this.cameras.instanceMatrix.needsUpdate=true;
  if(this.burst>=0 && this.burst<4){this.burst+=dt;const c=this.layout.center;
   for(let i=0;i<100;i++){const t=this.burst;this.dummy.position.set(c.x+Math.sin(i*12.7)*(3+t),Math.max(.17,6+(i%7)*.3-t*2.8),c.z+Math.cos(i*8.9)*(3+t));this.dummy.rotation.set(t+i,t*.7,i);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.confetti.setMatrixAt(i,this.dummy.matrix);}this.confetti.instanceMatrix.needsUpdate=true;
  }else if(this.burst>=4)this.confetti.visible=false;
 }
}
