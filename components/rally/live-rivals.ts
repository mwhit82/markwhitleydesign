import * as T from 'three';
import {headingBetween} from './replay';
import type {LivePose} from './room-types';
export class LiveRivals{
 group=new T.Group();private cars=new Map<string,{car:T.Group;from:LivePose;to:LivePose;at:number;fadeAt:number}>();
 receive(p:LivePose,model:T.Group,color='#68c4d0'){
  let rival=this.cars.get(p.id);if(!rival){if(this.cars.size>=3)return;const car=model.clone(true);car.visible=true;const lights:T.Object3D[]=[];car.traverse(o=>{if(o instanceof T.Light)lights.push(o);if(o instanceof T.Mesh){o.visible=true;o.material=(o.material as T.Material).clone();const m=o.material as T.MeshStandardMaterial;m.transparent=true;m.opacity=.48;m.depthWrite=false;m.color.set(color);o.castShadow=false;o.renderOrder=3;}});lights.forEach(o=>o.removeFromParent());car.position.set(p.x,0,p.z);car.rotation.y=p.heading;rival={car,from:p,to:p,at:performance.now(),fadeAt:performance.now()};this.cars.set(p.id,rival);this.group.add(car);}
  if(performance.now()-rival.at>2000){rival.from=p;rival.fadeAt=performance.now();}else rival.from={...rival.to,x:rival.car.position.x,z:rival.car.position.z,heading:rival.car.rotation.y};rival.to=p;rival.at=performance.now();
 }
 update(now:number,height:(x:number,z:number)=>number){for(const r of this.cars.values()){const age=now-r.at,t=Math.min(1,age/100);r.car.visible=age<2000;if(!r.car.visible)continue;const x=T.MathUtils.lerp(r.from.x,r.to.x,t),z=T.MathUtils.lerp(r.from.z,r.to.z,t);r.car.position.set(x,height(x,z),z);r.car.rotation.set(0,headingBetween(r.from.heading,r.to.heading,t),0);r.car.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).opacity=.48*Math.max(0,Math.min(1,(2000-age)/1000,(now-r.fadeAt)/200));});}}
 clear(){for(const r of this.cars.values())r.car.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).dispose();});this.cars.clear();this.group.clear();}
}
