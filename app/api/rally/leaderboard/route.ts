import { configured, player, redis, rateLimit, sameOrigin } from '../../../../lib/rally/store';
import { boardKey, validSelection, type StageSelection } from '../../../../components/rally/stages';
import { validName, validateRun, validCar, replayAgrees } from '../../../../lib/rally/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const unavailable=()=>Response.json({error:'Shared leaderboards are not connected yet. Personal bests still save on this device.'},{status:503});
export async function GET(request:Request) {
  if(!configured()) return unavailable();
  try {
    const q=new URL(request.url).searchParams;
    const selection={stage:q.get('stage'),weather:q.get('weather'),reverse:q.get('reverse')==='true',timeOfDay:q.get('timeOfDay')??'midday'};
    const offset=Number(q.get('offset')||0),car=q.get('car');
    if(!validSelection(selection)||!Number.isInteger(offset)||offset<0||offset>100000 || (car!==null&&!validCar(Number(car)))) return Response.json({error:'Invalid board'},{status:400});
    const board=`rally:${boardKey(selection)}${car===null?'':`:car${car}`}`;
    const id=await player();
    const [rows,total,rank]=await Promise.all([redis<string[]>('ZRANGE',board,offset,offset+19,'WITHSCORES'),redis<number>('ZCARD',board),id?redis<number|null>('ZRANK',board,id):null]);
    const ids=rows.filter((_,i)=>i%2===0);
    const metadata=ids.length?await redis<(string|null)[]>('HMGET',`${board}:info`,...ids):[];
    const entries=ids.map((member,i)=>({...JSON.parse(metadata[i]||'{}'),rank:offset+i+1,time:Number(rows[i*2+1])/1000,mine:member===id}));
    let me=null;
    if(id && rank!==null) {
      const [info,score]=await Promise.all([redis<string|null>('HGET',`${board}:info`,id),redis<string>('ZSCORE',board,id)]);
      me={...JSON.parse(info||'{}'),rank:rank+1,time:Number(score)/1000,mine:true};
    }
    return Response.json({entries,total,me,more:offset+20<total},{headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({error:'Leaderboard temporarily unavailable. Try again shortly.'},{status:503});}
}
const saveScript=`
if not redis.call('GET',KEYS[1]) then return 0 end
redis.call('DEL',KEYS[1])
for i=2,3 do
 local old=redis.call('ZSCORE',KEYS[i],ARGV[1])
 if not old or tonumber(ARGV[2])<tonumber(old) then
  redis.call('ZADD',KEYS[i],ARGV[2],ARGV[1])
  redis.call('HSET',KEYS[i]..':info',ARGV[1],ARGV[3])
  if ARGV[4]~='' then redis.call('HSET',KEYS[i]..':replays',ARGV[1],ARGV[4]) else redis.call('HDEL',KEYS[i]..':replays',ARGV[1]) end
 end
end
return 1`;
export async function POST(request:Request) {
  if(!configured()) return unavailable();
  if(!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  try {
    if(Number(request.headers.get('content-length'))>300000) return new Response(null,{status:413});
    const text=await request.text(); if(text.length>300000) return new Response(null,{status:413});
    const {run,name,time,trace,replay}=JSON.parse(text);
    if(typeof run!=='string'||!/^[a-f0-9-]{36}$/.test(run)||!validName(name)) return Response.json({error:'Use a name with 2–20 letters, numbers, spaces, dots, underscores or hyphens.'},{status:400});
    const id=await player(); if(!id) return Response.json({error:'Start a new run to submit a time.'},{status:403});
    if(!await rateLimit(id,'submit',6)) return Response.json({error:'Please wait a minute before submitting again.'},{status:429});
    const raw=await redis<string|null>('GET',`rally:run:${run}`);
    if(!raw) return Response.json({error:'This run expired or was already submitted. Start a new run.'},{status:400});
    const stored=JSON.parse(raw) as {player:string;selection:StageSelection;car:number;started:number};
    if(stored.player!==id || !validateRun(stored.selection,time,trace,(Date.now()-stored.started)/1000)) return Response.json({error:'This run could not be verified. Complete a new stage without resetting the car.'},{status:400});
    if(replay!==undefined && !replayAgrees(replay,stored.selection,stored.car,time,trace))return Response.json({error:'Replay does not match this run.'},{status:400});
    const board=`rally:${boardKey(stored.selection)}`;
    const saved=await redis<number>('EVAL',saveScript,3,`rally:run:${run}`,board,`${board}:car${stored.car}`,id,Math.round(time*1000),JSON.stringify({name:name.trim(),car:stored.car}),replay ? JSON.stringify(replay) : "");
    if(!saved) return Response.json({error:'Run already submitted.'},{status:409});
    return Response.json({saved:true});
  } catch {return Response.json({error:'Could not submit the time. Please try again.'},{status:503});}
}
