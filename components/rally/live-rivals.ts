import {cloneGhost,ghostOpacity,releaseVisual} from './visual-resources';
import * as T from 'three';
import {headingBetween} from './replay';
import type {LivePose} from './room-types';
export class LiveRivals{
 group=new T.Group();private cars=new Map<string,{car:T.Group;from:LivePose;to:LivePose;at:number;fadeAt:number}>();
 receive(p:LivePose,model:T.Group,color='#68c4d0'){
  let rival=this.cars.get(p.id);if(!rival){if(this.cars.size>=3)return;const car=cloneGhost(model,color,.48);car.visible=true;car.position.set(p.x,0,p.z);car.rotation.y=p.heading;rival={car,from:p,to:p,at:performance.now(),fadeAt:performance.now()};this.cars.set(p.id,rival);this.group.add(car);}
  if(performance.now()-rival.at>2000){rival.from=p;rival.fadeAt=performance.now();}else rival.from={...rival.to,x:rival.car.position.x,z:rival.car.position.z,heading:rival.car.rotation.y};rival.to=p;rival.at=performance.now();
 }
 update(now:number,height:(x:number,z:number,speed:number)=>number){for(const r of this.cars.values()){const age=now-r.at,t=Math.min(1,age/100);r.car.visible=age<2000;if(!r.car.visible)continue;const x=T.MathUtils.lerp(r.from.x,r.to.x,t),z=T.MathUtils.lerp(r.from.z,r.to.z,t);r.car.position.set(x,height(x,z,T.MathUtils.lerp(r.from.speed,r.to.speed,t)),z);r.car.rotation.set(0,headingBetween(r.from.heading,r.to.heading,t),0);ghostOpacity(r.car,.48*Math.max(0,Math.min(1,(2000-age)/1000,(now-r.fadeAt)/200)));}}
 clear(){for(const r of this.cars.values())releaseVisual(r.car);this.cars.clear();this.group.clear();}
}
