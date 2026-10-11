import {experimental_upgradeWebSocket} from '@vercel/functions';
import {authenticate,changeRoom,publicRoom,readRoom,roomRedis} from '../../../../../lib/rally/rooms';
import {configured,sameOrigin} from '../../../../../lib/rally/store';
import {roomAction} from '../../../../../lib/rally/room-state';
import type {RaceRoom} from '../../../../../components/rally/room-types';
import type {LivePose} from '../../../../../components/rally/room-types';
export const runtime='nodejs';export const maxDuration=300;
export async function GET(request:Request){
 if(!sameOrigin(request)||!configured())return new Response(null,{status:403});
 const code=new URL(request.url).searchParams.get('code')??'';if(!/^[A-Z2-9]{6}$/.test(code))return new Response(null,{status:400});
 return experimental_upgradeWebSocket(ws=>{
  const db=roomRedis();let member='',token='',closed=false,busy=false,lastMove=0,lastControl=0,previous:LivePose|null=null,current:RaceRoom|null=null,authenticating=false;
  let subscription:ReturnType<typeof db.subscribe>|undefined;
  const send=(data:unknown)=>{if(ws.readyState===1)ws.send(JSON.stringify(data));};
  const cleanup=()=>{if(closed)return;closed=true;clearTimeout(authTimer);clearInterval(heartbeat);void subscription?.unsubscribe().catch(()=>{});};
  const authTimer=setTimeout(()=>{if(!member)ws.close(1008,'Authentication required');},5000);
  const heartbeat=setInterval(()=>{if(member&&!busy)void changeRoom(code,r=>{if(!authenticate(r,member,token))throw Error('Expired membership');const m=r.members.find(m=>m.id===member)!;if(m.status==='disconnected')throw Error('Reconnect window expired');m.seen=Date.now();}).catch(()=>ws.close(1008,'Room expired'));},5000);
  ws.on('close',cleanup);ws.on('error',cleanup);
  ws.on('message',async raw=>{
   try{
    const text=raw.toString();if(text.length>300000)throw Error('Message too large');const m=JSON.parse(text);if(m.version!==1)throw Error('Game version changed. Refresh.');
    if(!member){if(authenticating)return;authenticating=true;if(m.type!=='hello'||typeof m.id!=='string'||typeof m.token!=='string')throw Error('Join a room first');const room=await readRoom(code);if(!room||!authenticate(room,m.id,m.token))throw Error('Invalid room membership');const seat=room.members.find(p=>p.id===m.id)!;if(Date.now()-seat.seen>20000||seat.status==='retired'||seat.status==='disconnected')throw Error('Reconnect window expired');if(closed)return;member=m.id;token=m.token;current=publicRoom(room);clearTimeout(authTimer);subscription=db.subscribe(`rally-room:${code}`);subscription.on('message',event=>{const message=event.message as {type:string;room?:RaceRoom};if(message.type==='room'&&message.room)current=message.room;send(message);});subscription.on('error',()=>ws.close(1011,'Connection interrupted'));send({type:'room',room:publicRoom(room),now:Date.now()});return;}
    if(m.type==='pose'){
     if(current?.phase!=='racing'||current.members.find(p=>p.id===member)?.status!=='racing')return;const now=Date.now();if(now<current.startAt)return;if(now-lastMove<85)return;lastMove=now;const p=m.pose;if(!p||![p.x,p.z,p.heading,p.speed,p.progress].every(Number.isFinite)||Math.abs(p.x)>100||Math.abs(p.z)>100||Math.abs(p.speed)>32||p.progress<0||p.progress>1)throw Error('Invalid movement');
     if(previous&&now-previous.sent<1000&&Math.hypot(p.x-previous.x,p.z-previous.z)>32*(now-previous.sent)/1000+3&&!m.recovered)return;
     previous={id:member,x:p.x,z:p.z,heading:p.heading,speed:p.speed,progress:p.progress,sent:now};await db.publish(`rally-room:${code}`,{type:'pose',pose:previous});return;
    }
    if((busy||Date.now()-lastControl<150)&&m.type!=='leave')return;busy=true;lastControl=Date.now();
    try{await changeRoom(code,r=>{
     if(!authenticate(r,member,token))throw Error('Expired membership');roomAction(r,member,m,Date.now());
    });}finally{busy=false;}
   }catch(e){authenticating=false;send({type:'error',error:e instanceof Error?e.message:'Room unavailable'});}
  });
 },{maxPayload:300000});
}
