export type Puddle={x:number;z:number;angle:number;rx:number;rz:number};
export function insidePuddle(p:Puddle,x:number,z:number){const dx=x-p.x,dz=z-p.z;return ((dx*Math.cos(p.angle)-dz*Math.sin(p.angle))/p.rx)**2+((dx*Math.sin(p.angle)+dz*Math.cos(p.angle))/p.rz)**2<=1;}
/** A bounded 6% loss over 0.3s on entry, not every frame spent in the water. */
export class PuddleDrag{
 private inside=new Set<number>();private remaining=0;
 reset(){this.inside.clear();this.remaining=0;}
 step(dt:number,car:{x:number;z:number},puddles:Puddle[]){if(dt<=0)return 1;const current=new Set<number>();let entered=false;puddles.forEach((p,i)=>{if(insidePuddle(p,car.x,car.z)){current.add(i);if(!this.inside.has(i))entered=true;}});if(entered&&this.remaining<=0)this.remaining=.3;this.inside=current;const duration=Math.min(dt,this.remaining);this.remaining=Math.max(0,this.remaining-dt);return Math.exp(Math.log(.94)*duration/.3);}
}
