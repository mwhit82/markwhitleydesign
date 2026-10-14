import {cloneGhost,releaseVisual} from './visual-resources';
import * as T from 'three';
import {headingBetween} from './replay';
import {loadVehicle} from './vehicle-visual';
import type {LivePose} from './room-types';
type Rival={car:T.Group;materials:T.Material[];samples:{pose:LivePose;received:number}[];fadeAt:number};
export class LiveRivals{
 group=new T.Group();private cars=new Map<string,Rival>();private pool:Rival[]=[];
 private generation=0;
 packetGap=0;onPacket:((gap:number)=>void)|null=null;
 private create(model:T.Group,color:string):Rival{const car=cloneGhost(model,color,.48),materials:T.Material[]=[];car.traverse(o=>{if(o instanceof T.Mesh)materials.push(...(Array.isArray(o.material)?o.material:[o.material]));});car.visible=false;this.group.add(car);return {car,materials,samples:[],fadeAt:0};}
 prewarm(model:T.Group){this.clear();for(const color of ['#68c4d0','#e6ad5c','#cfa1e2']){const r=this.create(model,color);r.car.visible=true;r.car.scale.setScalar(.001);this.pool.push(r);}}
 async prewarmDrivers(drivers:{id:string;car:number;color:string}[],fallback:T.Group){
  this.clear();const generation=this.generation;
  const loaded=await Promise.all(drivers.slice(0,3).map(async driver=>({driver,model:await loadVehicle(driver.car).catch(()=>null)})));
  for(const {driver,model} of loaded){if(generation===this.generation){const r=this.create(model??fallback,driver.color);r.car.visible=true;r.car.scale.setScalar(.001);this.cars.set(driver.id,r);}if(model)releaseVisual(model);}
 }
 hidePool(){for(const r of [...this.pool,...this.cars.values()])if(!r.samples.length)r.car.visible=false;}
 receive(p:LivePose,model:T.Group,color='#68c4d0'){
  const now=performance.now();
  let r=this.cars.get(p.id);if(!r){if(this.cars.size>=3)return;r=this.pool.shift()??this.create(model,color);r.car.scale.setScalar(1);for(const m of r.materials){const material=m as T.MeshStandardMaterial;if(material.color&&typeof m.userData.ghostBaseColor==='number')material.color.setHex(m.userData.ghostBaseColor).lerp(new T.Color(color),.55);}r.fadeAt=now;this.cars.set(p.id,r);}
  r.car.scale.setScalar(1);
  if(!r.samples.length)r.fadeAt=now;
  if(r.samples.length){this.packetGap=now-r.samples.at(-1)!.received;this.onPacket?.(this.packetGap);}
  if(r.samples.length&&now-r.samples.at(-1)!.received>2000){r.samples=[];r.fadeAt=now;}
  r.samples.push({pose:p,received:now});if(r.samples.length>8)r.samples.shift();
 }
 update(now:number,height:(x:number,z:number,speed:number)=>number){for(const r of this.cars.values()){
  if(!r.samples.length){r.car.visible=false;continue;}
  const last=r.samples.at(-1)!;const age=now-last.received;r.car.visible=age<2000;if(!r.car.visible)continue;
  const target=now-120;let a=r.samples[0],b=a;for(const sample of r.samples){if(sample.received<=target)a=sample;if(sample.received>=target){b=sample;break;}b=sample;}
  const t=a===b?0:T.MathUtils.clamp((target-a.received)/Math.max(1,b.received-a.received),0,1);
  let x=T.MathUtils.lerp(a.pose.x,b.pose.x,t),z=T.MathUtils.lerp(a.pose.z,b.pose.z,t);const heading=headingBetween(a.pose.heading,b.pose.heading,t);
  if(target>last.received){const seconds=Math.min(100,target-last.received)/1000;x+=Math.sin(heading)*last.pose.speed*seconds;z+=Math.cos(heading)*last.pose.speed*seconds;}
  const recorded=a.pose.y!==undefined&&b.pose.y!==undefined;const y=recorded?T.MathUtils.lerp(a.pose.y!,b.pose.y!,t):height(x,z,last.pose.speed);r.car.position.set(x,recorded?Math.max(y,height(x,z,last.pose.speed)):y,z);r.car.rotation.set(recorded?T.MathUtils.lerp(a.pose.pitch??0,b.pose.pitch??0,t):0,heading,recorded?T.MathUtils.lerp(a.pose.roll??0,b.pose.roll??0,t):0);
  const opacity=.48*Math.max(0,Math.min(1,(2000-age)/1000,(now-r.fadeAt)/200));for(const m of r.materials)m.opacity=opacity;
 }for(const r of this.pool)r.car.visible=false;}
 clear(){this.generation++;for(const r of [...this.cars.values(),...this.pool])releaseVisual(r.car);this.cars.clear();this.pool=[];this.group.clear();}
}
