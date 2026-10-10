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
  if(approach.getPoints(40).some(p=>points.slice(0,-35).some(q=>p.distanceTo(q)<8)))continue;
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
 layout:ReturnType<typeof finishLayout>;
 private people:T.InstancedMesh;
 private arms:T.InstancedMesh;
 private flashes:T.InstancedMesh;
 private confetti:T.InstancedMesh;
 private floor:T.InstancedMesh;
 private spectators:{x:number;z:number;angle:number;photo:boolean;road:T.Vector3;excursion:number;progress:number}[]=[];
 private clock=0;
 private reservedPath:T.Vector3[];
 private dummy=new T.Object3D();
 private burst=-1;
 private roofs:T.Mesh[]=[];
 reduced=typeof matchMedia!=='undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(points:T.Vector3[]) {
  this.layout=finishLayout(points);
  this.reservedPath=this.layout.approach.getPoints(24);
  const {center,angle}=this.layout;
  const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.9});
  const box=(w:number,h:number,d:number,color:string,x:number,y:number,z:number,parent=this.group)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const tent=new T.Group();tent.position.copy(center);tent.rotation.y=angle;this.group.add(tent);
  box(17,.12,18,'#cfbd92',0,.02,0,tent);
  const approach=this.layout.approach.getPoints(40),vertices:number[]=[],indices:number[]=[];
  approach.forEach((p,i)=>{const tangent=this.layout.approach.getTangent(i/40),right=new T.Vector3(tangent.z,0,-tangent.x).multiplyScalar(5.6);vertices.push(p.x-right.x,.075,p.z-right.z,p.x+right.x,.075,p.z+right.z);if(i<40){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}});
  const laneGeometry=new T.BufferGeometry();laneGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));laneGeometry.setIndex(indices);laneGeometry.computeVertexNormals();
  const lane=new T.Mesh(laneGeometry,mat('#cfbd92'));lane.receiveShadow=true;this.group.add(lane);
  for(const x of [-5,5])for(const z of [-4,4])box(.22,4.8,.22,'#f7eed8',x,2.4,z,tent);
  for(const side of [-1,1]) {const roof=box(5.6,.18,9.6,'#df5838',side*2.55,5.35,0,tent);roof.rotation.z=-side*.3;this.roofs.push(roof);}
  box(10.6,.6,.18,'#fff0d0',0,4.65,4.5,tent);
  // Shared geometry/material and instancing keep crowd and confetti draw calls bounded.
  this.people=new T.InstancedMesh(new T.SphereGeometry(.5,7,5),mat('#f2d3ad'),36*3);
  this.arms=new T.InstancedMesh(new T.BoxGeometry(.2,.7,.22),mat('#416b85'),72);
  this.flashes=new T.InstancedMesh(new T.SphereGeometry(.2,5,3),new T.MeshBasicMaterial({color:'#fffbdc'}),6);
  const camera=new T.InstancedMesh(new T.BoxGeometry(.48,.32,.28),mat('#343d3b'),6);
  const colors=['#dd593c','#3478a0','#e5b93f','#677f53','#a572a1','#eee9d8'];
  let count=0;
  for(const index of [90,210,340,480,600,640]) {
   const p=points[index],dir=points[Math.min(index+3,650)].clone().sub(points[index-3]).normalize();
   const right=new T.Vector3(dir.z,0,-dir.x);
   for(let j=0;j<6;j++) {
    let chosen:T.Vector3|null=null;
    for(const side of [1,-1])for(const distance of [10,13,17,21]) {
     const candidate=p.clone().addScaledVector(right,side*distance).addScaledVector(dir,(j-2.5)*1.4);
     if(points.every(q=>q.distanceTo(candidate)>8.7)&&!this.reserved(candidate.x,candidate.z)&&Math.abs(candidate.x)<81&&Math.abs(candidate.z)<76){chosen=candidate;break;}
    }
    // Guaranteed safe fallback behind the finish spectator barrier on extended apron.
    if(!chosen){
     for(let radius=18;!chosen && radius<100;radius+=3)for(let k=0;k<72;k++){
      const candidate=center.clone().add(new T.Vector3(Math.cos(k*Math.PI/36)*radius,0,Math.sin(k*Math.PI/36)*radius));
      if(points.every(q=>q.distanceTo(candidate)>8.7)&&!this.reserved(candidate.x,candidate.z)&&this.spectators.every(q=>Math.hypot(q.x-candidate.x,q.z-candidate.z)>1.3)){chosen=candidate;break;}
     }
    }
    if(!chosen)continue;
    const a=Math.atan2(p.x-chosen.x,p.z-chosen.z),photo=j===5;
    const excursion=!photo && (j===1||j===3) && chosen.distanceTo(p)<24?1:0;
    this.spectators.push({x:chosen.x,z:chosen.z,angle:a,photo,road:p.clone().addScaledVector(dir,(j-2.5)*2),excursion,progress:0});
    for(let part=0;part<3;part++) {
     this.dummy.position.set(chosen.x,part===0?.55:part===1?1.15:1.68,chosen.z);
     this.dummy.rotation.set(0,a,0);this.dummy.scale.set(part===2?.56:.66,part===2?.62:1,.6);this.dummy.updateMatrix();this.people.setMatrixAt(count*3+part,this.dummy.matrix);
     this.people.setColorAt(count*3+part,new T.Color(part===0?'#344a54':part===1?colors[count%6]:['#ecc49e','#bc8868','#805d48'][count%3]));
    }
    if(photo){this.dummy.position.set(chosen.x+Math.sin(a)*.4,1.55,chosen.z+Math.cos(a)*.4);this.dummy.rotation.set(0,a,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();camera.setMatrixAt(Math.floor(count/6),this.dummy.matrix);}
    if(!excursion){const barrier=box(1.2,.12,.12,'#f5d8a3',chosen.x+Math.sin(a)*.7,.8,chosen.z+Math.cos(a)*.7);barrier.rotation.y=a;}
    count++;
   }
  }
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
 reserved(x:number,z:number) {
  const p=new T.Vector3(x,0,z);
  return p.distanceTo(this.layout.center)<15 || this.reservedPath.some(q=>p.distanceTo(q)<10);
 }

 celebrate(){this.burst=0;this.confetti.visible=!this.reduced;for(const roof of this.roofs){const material=roof.material as T.MeshStandardMaterial;material.transparent=true;material.opacity=.28;material.depthWrite=false;material.needsUpdate=true;}}
 reset(){this.clock=0;for(const p of this.spectators)p.progress=0;this.burst=-1;this.confetti.visible=false;for(const roof of this.roofs){const material=roof.material as T.MeshStandardMaterial;material.transparent=false;material.opacity=1;material.depthWrite=true;material.needsUpdate=true;}}
 update(dt:number,_elapsed:number,car?:T.Vector3,speed=0,racing=false) {
  this.clock+=dt;const elapsed=this.clock;
  for(let i=0;i<this.spectators.length;i++) {
   const p=this.spectators[i];
   const travel=Math.hypot(p.road.x-p.x,p.road.z-p.z);
   const distance=car?Math.min(car.distanceTo(p.road),Math.hypot(car.x-p.x,car.z-p.z)):0;
   p.progress=fanProgress(p.progress,travel,distance,Math.abs(speed),dt,Boolean(p.excursion)&&racing&&!this.reduced&&(elapsed+i*1.7)%16<6);
   const x=T.MathUtils.lerp(p.x,p.road.x,p.progress),z=T.MathUtils.lerp(p.z,p.road.z,p.progress);
   if(p.excursion)for(let part=0;part<3;part++){
    this.dummy.position.set(x,part===0?.55:part===1?1.15:1.68,z);
    this.dummy.rotation.set(0,p.angle,0);this.dummy.scale.set(part===2?.56:.66,part===2?.62:1,.6);this.dummy.updateMatrix();this.people.setMatrixAt(i*3+part,this.dummy.matrix);
   }
   for(let side=0;side<2;side++) {
    const offset=side===0?-.43:.43;
    this.dummy.position.set(x+Math.cos(p.angle)*offset,1.3,z-Math.sin(p.angle)*offset);
    this.dummy.rotation.set(0,p.angle,p.photo?-.8:(side===0?-1:1)*(1.7+(this.reduced?0:Math.sin(elapsed*3+i)*.25)));this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.arms.setMatrixAt(i*2+side,this.dummy.matrix);
   }
   if(p.photo){this.dummy.position.set(p.x+Math.sin(p.angle)*.6,1.55,p.z+Math.cos(p.angle)*.6);this.dummy.scale.setScalar(!this.reduced && (elapsed+i*.71)%8<.06?1:0);this.dummy.updateMatrix();this.flashes.setMatrixAt(Math.floor(i/6),this.dummy.matrix);}
  }
  this.people.instanceMatrix.needsUpdate=true;this.arms.instanceMatrix.needsUpdate=true;this.flashes.instanceMatrix.needsUpdate=true;
  if(this.burst>=0 && this.burst<4){this.burst+=dt;const c=this.layout.center;
   for(let i=0;i<100;i++){const t=this.burst;this.dummy.position.set(c.x+Math.sin(i*12.7)*(3+t),Math.max(.17,6+(i%7)*.3-t*2.8),c.z+Math.cos(i*8.9)*(3+t));this.dummy.rotation.set(t+i,t*.7,i);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.confetti.setMatrixAt(i,this.dummy.matrix);}this.confetti.instanceMatrix.needsUpdate=true;
  }else if(this.burst>=4)this.confetti.visible=false;
 }
}
