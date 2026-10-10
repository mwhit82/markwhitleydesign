import { configured, redis } from '../../../../lib/rally/store';
import { validSelection, boardKey } from '../../../../components/rally/stages';
import { validCar } from '../../../../lib/rally/validation';
import { matchingReplay } from '../../../../components/rally/replay';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Read the leader, metadata and recording atomically so a concurrent PB cannot mix runs.
const readLeader=`local rows=redis.call('ZRANGE',KEYS[1],0,0,'WITHSCORES'); if #rows==0 then return {} end; return {rows[2],redis.call('HGET',KEYS[1]..':info',rows[1]) or '',redis.call('HGET',KEYS[1]..':replays',rows[1]) or ''}`;
export async function GET(request:Request){
 if(!configured())return Response.json({error:'Ghost unavailable'},{status:503});
 try{
  const q=new URL(request.url).searchParams;
  const selection={stage:q.get('stage'),weather:q.get('weather'),reverse:q.get('reverse')==='true'},car=Number(q.get('car'));
  if(!validSelection(selection)||q.get('car')===null||!validCar(car))return Response.json({error:'Invalid ghost selection'},{status:400});
  const rows=await redis<string[]>('EVAL',readLeader,1,`rally:${boardKey(selection)}:car${car}`);
  if(!rows.length)return Response.json({replay:null,name:null,time:null},{headers:{'Cache-Control':'no-store'}});
  const time=Number(rows[0])/1000,info=JSON.parse(rows[1]||'{}'),replay=JSON.parse(rows[2]||'null');
  return Response.json({name:info.name,time,replay:matchingReplay(replay,selection,car,time)?replay:null},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Ghost unavailable'},{status:503});}
}
