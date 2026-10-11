import {environmentScenery} from './v3-scenery';
import {kartBarrierSegments} from "./kart-venue";
import * as T from 'three';
import {type StageSelection} from './stages';
const ramps=[{index:135,height:.85},{index:325,height:2.2},{index:515,height:.85}];
export function rampHeight(index:number){let y=0;for(const r of ramps){const u=(index-(r.index-12))/24;if(u>0&&u<1)y=Math.max(y,r.height*Math.sin(Math.PI*u)**2);}return y;}
/** Cosmetic vertical profile only; ranked x/z motion, grip and traces stay unchanged.
 * Playback derives exactly the same profile from recorded horizontal speed. */
export function elevationPose(index:number,speed:number,reduced=false){
 let y=rampHeight(index),pitch=0,roll=0;
 for(const r of ramps){const u=(index-(r.index-12))/24;
  if(u>0&&u<1)pitch=-Math.sin(2*Math.PI*u)*r.height*.12;
  const lift=Math.max(0,Math.min(1,(speed-7)/15));
  if(u>.5&&u<1.3){const air=r.height*lift*Math.sin((u-.5)/.8*Math.PI);y+=air;pitch*=.5;}
  if(!reduced&&u>=1.3&&u<1.55){const t=(u-1.3)/.25;roll=Math.sin(t*Math.PI*4)*(1-t)*lift*.08;}
 }
 return {y,pitch,roll};
}
function panel(text:string,color:string,width=14){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const p=canvas.getContext('2d')!;p.fillStyle=color;p.fillRect(0,0,512,96);p.fillStyle='#fff0d5';p.font='italic 900 42px sans-serif';p.textAlign='center';p.fillText(text,256,64);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(width,2.2),new T.MeshStandardMaterial({map:texture,side:T.DoubleSide,roughness:.9}));
}
export class StageScenery {
 group=new T.Group();private birds:T.InstancedMesh|null=null;private object=new T.Object3D();private clock=0;
 constructor(selection:StageSelection,points:T.Vector3[],reserved:(x:number,z:number)=>boolean){
  this.group.name="stage-scenery";
  const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.9});
  const box=(w:number,h:number,d:number,color:string,x:number,y:number,z:number,parent=this.group)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;};
  if(selection.stage==='nyc'){this.group.add(environmentScenery(selection,points,reserved));return;}
  if(selection.stage==='kart'){
   this.group.add(environmentScenery(selection,points,reserved));
   const blocks=kartBarrierSegments(points,reserved),placements:T.Vector3[]=[];
   const barriers=new T.InstancedMesh(new T.BoxGeometry(.85,1.1,1),mat('#eee6cf'),blocks.length);
   blocks.forEach(({p,angle,length,normal},i)=>{
    this.object.position.copy(p).setY(.25);this.object.rotation.set(0,angle,0);this.object.scale.set(1,1,length+.12);this.object.updateMatrix();barriers.setMatrixAt(i,this.object.matrix);barriers.setColorAt(i,new T.Color((Math.floor((p.x+p.z)/5)%2+2)%2?'#eee6cf':'#b9493a'));
    const count=Math.max(1,Math.round(length/1.65));for(let j=0;j<count;j++){const tyre=p.clone().addScaledVector(normal,1.4).add(new T.Vector3(Math.sin(angle),0,Math.cos(angle)).multiplyScalar((j+.5)/count*length-length/2)).setY(-.06);if(!reserved(tyre.x,tyre.z)&&points.every(q=>Math.hypot(q.x-tyre.x,q.z-tyre.z)>7.1))placements.push(tyre);}
   });barriers.castShadow=true;barriers.receiveShadow=true;this.group.add(barriers);
   const tyres=new T.InstancedMesh(new T.TorusGeometry(.63,.24,5,10),mat('#292f2e'),placements.length);
   placements.forEach((p,i)=>{this.object.position.copy(p);this.object.rotation.set(Math.PI/2,0,0);this.object.scale.setScalar(1);this.object.updateMatrix();tyres.setMatrixAt(i,this.object.matrix);});tyres.castShadow=true;this.group.add(tyres);
   return;
  }
  for(const [j,index] of bridgeIndices(points,reserved).entries()){
   const p=points[index],next=points[index+1],bridge=new T.Group();bridge.position.copy(p);bridge.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);this.group.add(bridge);
   box(17,.7,3.2,selection.stage==='desert'?'#bd9169':'#84918a',0,5.3,0,bridge);
   for(const x of [-7.8,7.8])box(.8,5.2,2.8,'#7a8278',x,2.5,0,bridge);
   for(const z of [-1.65,1.65]){const ad=panel(j?'TURBO • MOTOR OIL':'APEX • RALLY TYRES',j?'#35789d':'#c65437');ad.position.set(0,6.1,z);bridge.add(ad);}
  }
  this.birds=new T.InstancedMesh(new T.ConeGeometry(.4,1.3,3),mat(selection.stage==='alpine'?'#f0eadd':selection.stage==='desert'?'#5c4939':'#344e48'),16);this.birds.frustumCulled=false;this.group.add(this.birds);this.update(0,false);
 }
 update(dt:number,reduced:boolean){
  this.clock+=dt;if(!this.birds)return;
  for(let i=0;i<8;i++)for(const side of [-1,1]){
   const t=this.clock*.12+i*2.3,x=Math.sin(t)*50,z=Math.cos(t*.83+i)*48;
   this.object.position.set(x+side*.4,10+i%3*2,z);this.object.rotation.set(0,t,side*(reduced?.3:.3+Math.sin(this.clock*5+i)*.45));this.object.scale.set(.7,.7,.18);this.object.updateMatrix();this.birds.setMatrixAt(i*2+(side===1?1:0),this.object.matrix);
  }this.birds.instanceMatrix.needsUpdate=true;
 }
}

/** Supports must clear every road segment, not just the road beneath the deck. */
export function bridgeIndices(points:T.Vector3[],reserved:(x:number,z:number)=>boolean){
 const chosen:number[]=[];
 for(const preferred of [235,445]){
  const candidates=Array.from({length:490},(_,i)=>i+80).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred));
  const index=candidates.find(i=>{
   if(chosen.some(n=>Math.abs(n-i)<90)||rampHeight(i)>0)return false;
   const p=points[i],direction=points[i+4].clone().sub(points[i-4]).normalize();
   const before=p.clone().sub(points[i-10]).normalize(),after=points[i+10].clone().sub(p).normalize();
   if(before.dot(after)<.97||reserved(p.x,p.z))return false;
   return [-1,1].every(side=>{const x=p.x+direction.z*7.8*side,z=p.z-direction.x*7.8*side;return !reserved(x,z)&&points.every(q=>Math.hypot(q.x-x,q.z-z)>6.9);});
  });if(index!==undefined)chosen.push(index);
 }return chosen;
}
