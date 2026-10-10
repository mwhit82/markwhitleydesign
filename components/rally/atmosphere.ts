import * as T from 'three';
export function finishLayout(points:T.Vector3[]) {
 const finish=points[points.length-1].clone();
 const direction=finish.clone().sub(points[points.length-8]).normalize();
 const center=finish.clone().addScaledVector(direction,11);
 return {finish,direction,center,angle:Math.atan2(direction.x,direction.z)};
}
export class Atmosphere {
 group=new T.Group();
 layout:ReturnType<typeof finishLayout>;
 private people:T.InstancedMesh;
 private arms:T.InstancedMesh;
 private flashes:T.InstancedMesh;
 private confetti:T.InstancedMesh;
 private floor:T.InstancedMesh;
 private spectators:{x:number;z:number;angle:number;photo:boolean}[]=[];
 private dummy=new T.Object3D();
 private burst=-1;
 private roofs:T.Mesh[]=[];
 reduced=typeof matchMedia!=='undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(points:T.Vector3[]) {
  this.layout=finishLayout(points);
  const {center,angle}=this.layout;
  const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.9});
  const box=(w:number,h:number,d:number,color:string,x:number,y:number,z:number,parent=this.group)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const tent=new T.Group();tent.position.copy(center);tent.rotation.y=angle;this.group.add(tent);
  box(17,.12,23,'#cfbd92',0,.02,-4,tent);
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
    this.spectators.push({x:chosen.x,z:chosen.z,angle:a,photo});
    for(let part=0;part<3;part++) {
     this.dummy.position.set(chosen.x,part===0?.55:part===1?1.15:1.68,chosen.z);
     this.dummy.rotation.set(0,a,0);this.dummy.scale.set(part===2?.56:.66,part===2?.62:1,.6);this.dummy.updateMatrix();this.people.setMatrixAt(count*3+part,this.dummy.matrix);
     this.people.setColorAt(count*3+part,new T.Color(part===0?'#344a54':part===1?colors[count%6]:['#ecc49e','#bc8868','#805d48'][count%3]));
    }
    if(photo){this.dummy.position.set(chosen.x+Math.sin(a)*.4,1.55,chosen.z+Math.cos(a)*.4);this.dummy.rotation.set(0,a,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();camera.setMatrixAt(Math.floor(count/6),this.dummy.matrix);}
    const barrier=box(1.2,.12,.12,'#f5d8a3',chosen.x-Math.sin(a)*-.7,.8,chosen.z-Math.cos(a)*-.7);barrier.rotation.y=a;
    count++;
   }
  }
  this.group.add(this.people,this.arms,this.flashes,camera);
  const paper=new T.PlaneGeometry(.17,.3),paperMat=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide});
  this.floor=new T.InstancedMesh(paper,paperMat,180);this.confetti=new T.InstancedMesh(paper,paperMat,100);
  for(let i=0;i<180;i++) {
   const x=Math.sin(i*47.2)*7,z=Math.cos(i*19.3)*10;
   this.dummy.position.set(center.x+x*Math.cos(angle)+z*Math.sin(angle),.14,center.z-x*Math.sin(angle)+z*Math.cos(angle));this.dummy.rotation.set(-Math.PI/2,0,i);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.floor.setMatrixAt(i,this.dummy.matrix);this.floor.setColorAt(i,new T.Color(colors[i%6]));
  }
  for(let i=0;i<100;i++)this.confetti.setColorAt(i,new T.Color(colors[i%6]));
  this.confetti.visible=false;this.group.add(this.floor,this.confetti);
 }
 reserved(x:number,z:number) {
  const {finish,center}=this.layout;
  const p=new T.Vector3(x,0,z),delta=center.clone().sub(finish),t=T.MathUtils.clamp(p.clone().sub(finish).dot(delta)/delta.lengthSq(),0,1);
  return p.distanceTo(finish.clone().addScaledVector(delta,t))<16;
 }
 celebrate(){this.burst=0;this.confetti.visible=!this.reduced;for(const roof of this.roofs){const material=roof.material as T.MeshStandardMaterial;material.transparent=true;material.opacity=.28;material.depthWrite=false;}}
 reset(){this.burst=-1;this.confetti.visible=false;for(const roof of this.roofs){const material=roof.material as T.MeshStandardMaterial;material.transparent=false;material.opacity=1;material.depthWrite=true;}}
 update(dt:number,elapsed:number) {
  for(let i=0;i<this.spectators.length;i++) {
   const p=this.spectators[i];
   for(let side=0;side<2;side++) {
    const offset=side===0?-.43:.43;
    this.dummy.position.set(p.x+Math.cos(p.angle)*offset,1.3,p.z-Math.sin(p.angle)*offset);
    this.dummy.rotation.set(0,p.angle,p.photo?-.8:(side===0?-1:1)*(1.7+(this.reduced?0:Math.sin(elapsed*3+i)*.25)));this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.arms.setMatrixAt(i*2+side,this.dummy.matrix);
   }
   if(p.photo){this.dummy.position.set(p.x+Math.sin(p.angle)*.6,1.55,p.z+Math.cos(p.angle)*.6);this.dummy.scale.setScalar(!this.reduced && (elapsed+i*.71)%8<.06?1:0);this.dummy.updateMatrix();this.flashes.setMatrixAt(Math.floor(i/6),this.dummy.matrix);}
  }
  this.arms.instanceMatrix.needsUpdate=true;this.flashes.instanceMatrix.needsUpdate=true;
  if(this.burst>=0 && this.burst<4){this.burst+=dt;const c=this.layout.center;
   for(let i=0;i<100;i++){const t=this.burst;this.dummy.position.set(c.x+Math.sin(i*12.7)*(3+t),Math.max(.17,6+(i%7)*.3-t*2.8),c.z+Math.cos(i*8.9)*(3+t));this.dummy.rotation.set(t+i,t*.7,i);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.confetti.setMatrixAt(i,this.dummy.matrix);}this.confetti.instanceMatrix.needsUpdate=true;
  }else if(this.burst>=4)this.confetti.visible=false;
 }
}
