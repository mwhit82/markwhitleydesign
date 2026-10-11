export type TrialTerrain={version:number;width:number;length:number;laneLimit:number;wheelbase:number;trackWidth:number;wheelRadius:number;bumps:{z:number;height:number;width:number}[];puddles:{x:number;z:number;rx:number;rz:number;level:number;depth:number}[]};
export function puddleRadius(p:TrialTerrain['puddles'][number],x:number,z:number){return Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);}
export function terrainHeight(t:TrialTerrain,x:number,z:number){
 let y=.025*Math.sin(x*.8+z*.35)+.018*Math.cos(z*1.4)+.012*Math.sin(x*3+z*2);
 y-=.038*Math.exp(-Math.pow((Math.abs(x)-t.trackWidth/2)/.22,2));
 for(const b of t.bumps)y+=b.height*Math.exp(-Math.pow((z-b.z)/b.width,2))*Math.exp(-Math.pow(x/3.8,4));
 for(const p of t.puddles){const r=puddleRadius(p,x,z);if(r<1.22){const k=Math.min(1,Math.max(0,(1.22-r)/.25));const smooth=k*k*(3-2*k);const basin=p.level-p.depth*Math.max(0,1-r*r);y=y*(1-smooth)+basin*smooth;}}
 return y;
}
export class TrialDrive{
 position=0;speed=0;distance=0;private wet=new Set<number>();private dragTime=0;
 reset(){this.position=0;this.speed=0;this.distance=0;this.wet.clear();this.dragTime=0;}
 step(dt:number,input:number,t:TrialTerrain){
  if(dt<=0)return;dt=Math.min(.05,dt);input=Math.sign(input);
  const remaining=Math.max(0,t.laneLimit+input*this.position);
  const target=input*Math.min(12/3.6,Math.sqrt(2*3*remaining)),rate=input?2.5:3.8;this.speed+=(target-this.speed)*(1-Math.exp(-rate*dt));
  const inside=new Set<number>();let entry=false;t.puddles.forEach((p,i)=>{if(puddleRadius(p,0,this.position)<1){inside.add(i);if(!this.wet.has(i))entry=true;}});if(entry&&this.dragTime<=0)this.dragTime=.3;this.wet=inside;const drag=Math.min(dt,this.dragTime);this.speed*=Math.exp(Math.log(.94)*drag/.3);this.dragTime=Math.max(0,this.dragTime-dt);
  const previous=this.position;this.position=Math.max(-t.laneLimit,Math.min(t.laneLimit,this.position-this.speed*dt));if(Math.abs(this.position)===t.laneLimit)this.speed=0;this.distance+=previous-this.position;
 }
 wheelHeights(t:TrialTerrain){return [-1,1].flatMap(side=>[-1,1].map(axle=>terrainHeight(t,side*t.trackWidth/2,this.position+axle*t.wheelbase/2)));}
}
