import {sweepRoom as sweep} from './room-state';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {Redis} from '@upstash/redis';
import {validSelection,compatibleCar} from '../../components/rally/stages';
import type {RaceRoom} from '../../components/rally/room-types';
export type StoredRoom=RaceRoom&{secrets:Record<string,string>};
export const roomRedis=()=>new Redis({url:(process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL)!,token:(process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN)!});
const key=(code:string)=>`rally:room:v1:${code}`;
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const publicRoom=(r:StoredRoom):RaceRoom=>{return {version:r.version,code:r.code,host:r.host,selection:r.selection,car:r.car,phase:r.phase,attempt:r.attempt,startAt:r.startAt,members:r.members};};
export async function readRoom(code:string){return roomRedis().get<StoredRoom>(key(code));}
export async function changeRoom(code:string,fn:(r:StoredRoom)=>void){
 const db=roomRedis();for(let i=0;i<8;i++){
  const r=await db.get<StoredRoom>(key(code));if(!r)throw Error('Room expired. Create a new room.');const before=JSON.stringify(r);sweep(r,Date.now());fn(r);sweep(r,Date.now());
  const next=JSON.stringify(r);const ok=await db.eval("if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',1800);return 1 end;return 0",[key(code)],[before,next]);
  if(ok){await db.publish(`rally-room:${code}`,{type:'room',room:publicRoom(r),now:Date.now()});return r;}
 }throw Error('Room busy. Please retry.');
}
export function authenticate(r:StoredRoom,id:string,token:string){return r.secrets[id]===digest(token)&&r.members.some(m=>m.id===id);}
export async function enterRoom(body:{version?:number;code?:string;name:string;selection:unknown;car:number}){
 const token=randomBytes(24).toString('hex'),id=randomUUID(),now=Date.now();
 const member={id,name:body.name.trim(),ready:false,seen:now,status:'lobby' as const,car:body.car};
 if(body.code){const code=body.code.toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw Error('Enter the six-character room code.');const r=await changeRoom(code,r=>{if(r.version!==(body.version===3?3:body.version===2?2:1))throw Error('Game version changed. Refresh to join.');if(r.phase!=='lobby')throw Error('This race has started. Join after the rematch.');r.members=r.members.filter(m=>m.status!=='disconnected'&&m.status!=='retired');if(r.members.length>=4)throw Error('Room full — four drivers maximum.');member.car=compatibleCar(r.selection,body.car)?body.car:r.car;for(const p of r.members)p.ready=false;r.members.push(member);r.secrets[id]=digest(token);});return {room:publicRoom(r),id,token};}
 if((body.version!==2&&body.version!==3&&body.car>=9)||!validSelection(body.selection)||!compatibleCar(body.selection,body.car))throw Error('Invalid race setup.');
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 for(let i=0;i<8;i++){const code=Array.from(randomBytes(6),b=>alphabet[b%alphabet.length]).join('');const r:StoredRoom={version:body.version===3?3:body.version===2?2:1,code,host:id,selection:body.selection,car:body.car,phase:'lobby',attempt:0,startAt:0,members:[member],secrets:{[id]:digest(token)}};
 if(await roomRedis().set(key(code),JSON.stringify(r),{nx:true,ex:1800}))return {room:publicRoom(r),id,token};}
 throw Error('Could not create room. Retry.');
}
