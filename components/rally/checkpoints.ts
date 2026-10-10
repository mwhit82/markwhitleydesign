export type Point = {x:number;z:number};
export type RunReason = 'missed-checkpoint' | 'car-recovered' | 'time-limit';
export type Eligibility = {eligible:boolean; reasons:RunReason[]};
export const reasonText:Record<RunReason,string> = {
 'missed-checkpoint':'Missed checkpoint', 'car-recovered':'Car recovered', 'time-limit':'Over the ten-minute ranked limit',
};
export type CheckpointEvent = {checkpoint:number; outcome:'accepted'|'missed'; time:number; delta?:number};
export type CheckpointNotice = {id:number; checkpoints:number[]; outcome:CheckpointEvent['outcome']; time:number; delta?:number; duration:number; remaining:number};
export function segmentDistance(a:Point,b:Point,p:Point){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
 return Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z);
}
export function forwardGateCrossing(a:Point,b:Point,center:Point,before:Point,halfWidth=7){
 const dx=center.x-before.x,dz=center.z-before.z,length=Math.hypot(dx,dz);
 if(!length)return false;
 const nx=dx/length,nz=dz/length;
 const from=(a.x-center.x)*nx+(a.z-center.z)*nz,to=(b.x-center.x)*nx+(b.z-center.z)*nz;
 if(from>0||to<=0)return false;
 const t=-from/(to-from),x=a.x+(b.x-a.x)*t-center.x,z=a.z+(b.z-a.z)*t-center.z;
 return Math.abs(x*nz-z*nx)<=halfWidth;
}
// The cursor only advances, so each checkpoint emits exactly once per attempt.
export function advanceCheckpoints(points:Point[],indices:number[],cursor:number,a:Point,b:Point,time:number){
 const events:CheckpointEvent[]=[];
 while(cursor<indices.length && segmentDistance(a,b,points[indices[cursor]])<7){
  if(cursor===indices.length-1){
   const end=points[indices[cursor]],before=points[indices[cursor]-1];
   if((b.x-a.x)*(end.x-before.x)+(b.z-a.z)*(end.z-before.z)<=0)break;
  }
  events.push({checkpoint:++cursor,outcome:'accepted',time});
 }
 let crossed=-1;
 for(let i=cursor;i<indices.length;i++){
  const index=indices[i];
  if(forwardGateCrossing(a,b,points[index],points[Math.max(0,index-1)]))crossed=i;
 }
 if(crossed>=cursor){
  while(cursor<crossed)events.push({checkpoint:++cursor,outcome:'missed',time});
  events.push({checkpoint:++cursor,outcome:'accepted',time});
 }
 return {cursor,events,finished:cursor===indices.length};
}
export class CheckpointNotifications {
 items:CheckpointNotice[]=[];
 private nextId=0;
 clear(){this.items=[];}
 push(events:CheckpointEvent[]){
  const missed=events.filter(e=>e.outcome==='missed');
  const accepted=events.filter(e=>e.outcome==='accepted').at(-1);
  const incoming:CheckpointNotice[]=[];
  if(missed.length)incoming.push({id:++this.nextId,checkpoints:missed.map(e=>e.checkpoint),outcome:'missed',time:missed[0].time,duration:4,remaining:4});
  if(accepted)incoming.push({id:++this.nextId,checkpoints:[accepted.checkpoint],outcome:'accepted',time:accepted.time,delta:accepted.delta,duration:2,remaining:2});
  const all=[...this.items,...incoming];
  this.items=[...all.filter(n=>n.outcome==='missed').slice(-2),...all.filter(n=>n.outcome==='accepted').slice(-2).reverse()].slice(0,2);
 }
 tick(dt:number,paused=false){
  if(paused)return false;
  const before=this.items.length;
  this.items.forEach(n=>n.remaining-=dt);
  this.items=this.items.filter(n=>n.remaining>0);
  return before!==this.items.length;
 }
}
