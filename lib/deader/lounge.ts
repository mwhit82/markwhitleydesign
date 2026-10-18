import { visitorById, type VisitorDefinition } from './visitors';
import { move, ROOM_OBSTACLES, ROOM_CLOSED_OBSTACLES } from './game';
export const MIMIC_ATTACK_SECONDS=15;
export const MIMIC_VICTIM_AT=12;
export const MIMIC_LEAVE_SECONDS=5;
export const SEATS = Array.from({length:12},(_,i)=>({x:[-2.4,-1.2,1.2,2.4][i%4],z:5.5+Math.floor(i/4)*1.5}));
export type Resident = {id:string; visitor:string; seat:number; phase:'entering'|'seated'|'leaving'; elapsed:number; profile?:VisitorDefinition; mimicStage?:number; mimicSeen?:string[]; attackSeconds?:number; victim?:string|null};
export function admitResident(residents:Resident[], id:string, visitor:string, profile?:VisitorDefinition):Resident[] {
  if(residents.some(r=>r.id===id)) return residents;
  const occupied=new Set(residents.filter(r=>r.phase!=='leaving').map(r=>r.seat));
  const free=SEATS.findIndex((_,i)=>!occupied.has(i));
  if(free>=0) return [...residents,{id,visitor,profile,mimicStage:visitor==='mimic'?0:undefined,mimicSeen:[],seat:free,phase:'entering',elapsed:0}];
  const oldest=residents.find(r=>r.phase!=='leaving')!;
  return [...residents.map(r=>r.id===oldest.id?{...r,phase:'leaving' as const,elapsed:0}:r),{id,visitor,profile,mimicStage:visitor==='mimic'?0:undefined,mimicSeen:[],seat:oldest.seat,phase:'entering',elapsed:0}];
}
export function tickResidents(residents:Resident[],dt:number, doorOpen=true):Resident[] {
  if(!Number.isFinite(dt)||dt<=0)return residents;
  const removed=new Set(residents.filter(r=>r.attackSeconds!==undefined&&r.attackSeconds>=MIMIC_VICTIM_AT&&r.victim).map(r=>r.victim));
  return residents.filter(r=>!removed.has(r.id)).flatMap(r=>{
    if(r.attackSeconds!==undefined){const attackSeconds=r.attackSeconds+Math.min(.25,dt);return attackSeconds>=MIMIC_ATTACK_SECONDS?[{...r,attackSeconds:undefined,phase:'leaving' as const,elapsed:0}]:[{...r,attackSeconds}];}
    if((r.phase==='entering'&&r.elapsed===0&&!doorOpen)||r.phase==='seated'||(r.phase==='entering'&&residents.some(other=>other.seat===r.seat&&other.phase==='leaving')))return [r];
    const elapsed=r.elapsed+Math.min(.25,dt);
    if(r.phase==='leaving'&&elapsed>=(r.mimicStage===3?MIMIC_LEAVE_SECONDS:3))return [];
    return [{...r,elapsed,phase:r.phase==='entering'&&elapsed>=8?'seated' as const:r.phase}];
  });
}
function along(points:{x:number;z:number}[], fraction:number) {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));
  let distance=lengths.reduce((a,b)=>a+b,0)*Math.min(1,Math.max(0,fraction));
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]){const t=lengths[i]?distance/lengths[i]:0;return {x:points[i].x+(points[i+1].x-points[i].x)*t,z:points[i].z+(points[i+1].z-points[i].z)*t,y:0};}
    distance-=lengths[i];
  }
  return {...points[points.length-1],y:0};
}
export function residentPosition(r:Resident) {
  const seat=SEATS[r.seat], aisle={x:0,z:seat.z+.75}, front={x:seat.x,z:seat.z+.75};
  if(r.phase==='seated')return {...seat,y:.25};
  if(r.phase==='leaving')return along([seat,front,aisle,{x:0,z:10},{x:3.3,z:10},{x:3.3,z:10.7}],r.elapsed/(r.mimicStage===3?MIMIC_LEAVE_SECONDS:3));
  return along([{x:0,z:-3.5},aisle,front,seat],r.elapsed/8);
}
const furniture=SEATS.map(p=>({...p,hx:.42,hz:.38}));
export function moveInRooms(p:{x:number;z:number},x:number,z:number,dt:number,open:boolean){
  const obstacles=[...(open?ROOM_OBSTACLES:ROOM_CLOSED_OBSTACLES),...furniture];
  const valid=(q:typeof p)=>Math.abs(q.x)<=3.4&&q.z>=-3.5&&q.z<=10.4&&(Math.abs(q.z-3.8)>.4||Math.abs(q.x)<.7);
  let next=move(p,x,z,dt,11,obstacles);
  if(valid(next))return next;
  next={x:next.x,z:p.z}; if(valid(next))return next;
  next=move(p,0,z,dt,11,obstacles);return valid(next)?next:p;
}

/** One advancement per later resolved door visitor; never from UI/render callbacks. */
export function advanceMimics(residents:Resident[], encounterId:string):Resident[] {
 return residents.map(r=>{
  if((r.profile??visitorById(r.visitor)).behaviour!=="mimic"||r.id===encounterId||r.phase==='leaving'||(r.mimicStage??0)>=3||r.mimicSeen?.includes(encounterId))return r;
  const stage=(r.mimicStage??0)+1;
  const victim=stage===3?residents.find(other=>other.id!==r.id&&other.phase==='seated'&&other.profile?.behaviour!=="mimic"&&other.visitor!=="mimic")?.id:null;
  return {...r,mimicStage:stage,mimicSeen:[...(r.mimicSeen??[]),encounterId],...(stage===3?{attackSeconds:0,victim:victim??null}:{})};
 });
}
export const cancelMimics=(residents:Resident[])=>residents.filter(r=>(r.profile??visitorById(r.visitor)).behaviour!=="mimic");

export function loungeAlert(residents:Resident[]) {
 const resident=residents.find(r=>r.mimicStage===3&&(r.attackSeconds!==undefined||r.phase==='leaving'));
 if(!resident)return null;
 return {id:resident.id,leaving:resident.phase==='leaving',seconds:Math.max(0,Math.ceil(resident.attackSeconds!==undefined?MIMIC_ATTACK_SECONDS-resident.attackSeconds:MIMIC_LEAVE_SECONDS-resident.elapsed))};
}
