import { configured, player, redis, rateLimit, sameOrigin } from '@/lib/soccer98/store';
import { boardWindow, readBoardWindow, periodBoardKey } from '@/lib/rally/period';
import { validName, validateReplay } from '@/lib/soccer98/validation';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!configured()) return Response.json({error:'Leaderboards are temporarily unavailable.'},{status:503});
  const window = readBoardWindow(new URL(request.url).searchParams);
  if (!window) return Response.json({error:'Invalid period.'},{status:400});
  try {
    const board = periodBoardKey('soccer98:board',window), id = await player();
    const [rows,rank,total] = await Promise.all([redis<string[]>('ZREVRANGE',board,0,49,'WITHSCORES'),id ? redis<number|null>('ZREVRANK',board,id) : null,redis<number>('ZCARD',board)]);
    const ids = rows.filter((_,i)=>i%2===0);
    const names = ids.length ? await redis<(string|null)[]>('HMGET',`${board}:names`,...ids) : [];
    const entries = ids.map((key,i)=>({rank:i+1,name:names[i]||'Player',score:Number(rows[i*2+1]),mine:key===id}));
    const me = id && rank !== null ? {rank:rank+1,score:Number(await redis('ZSCORE',board,id))} : null;
    return Response.json({entries,me,total,window},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Leaderboards are temporarily unavailable.'},{status:503}); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid origin.'},{status:403});
  if (!configured()) return Response.json({error:'Leaderboards are temporarily unavailable.'},{status:503});
  try {
    if (Number(request.headers.get('content-length')) > 26000) return Response.json({error:'Match too long to submit.'},{status:413});
    const text = await request.text();
    if (text.length > 26000) return Response.json({error:'Match too long to submit.'},{status:413});
    const {run,name,trace} = JSON.parse(text);
    if (typeof run !== 'string' || !/^[a-f0-9-]{36}$/.test(run) || !validName(name)) return Response.json({error:'Use a name of 2–20 letters or numbers.'},{status:400});
    const id = await player();
    if (!id) return Response.json({error:'Start a new match to enter the table.'},{status:401});
    if (!await rateLimit(id,'submit',10)) return Response.json({error:'Please try again in a minute.'},{status:429});
    const key = `soccer98:run:${run}`, raw = await redis<string|null>('GET',key);
    if (!raw) return Response.json({error:'Match expired or already submitted.'},{status:409});
    const saved = JSON.parse(raw);
    if (saved.player !== id) return Response.json({error:'Match belongs to another player.'},{status:403});
    const score = validateReplay(saved.seed,trace,Date.now()-saved.started);
    if (score === null) return Response.json({error:'This match could not be verified.'},{status:400});
    const week = boardWindow('weekly',new Date(saved.started));
    const accepted = await redis<number>('EVAL',`if not redis.call('GET',KEYS[1]) then return 0 end
redis.call('DEL',KEYS[1])
for i=2,#KEYS do
 local old=redis.call('ZSCORE',KEYS[i],ARGV[1])
 if not old or tonumber(ARGV[2])>=tonumber(old) then
 redis.call('ZADD',KEYS[i],ARGV[2],ARGV[1])
 redis.call('HSET',KEYS[i]..':names',ARGV[1],ARGV[3])
 end
end
return 1`,3,key,'soccer98:board',periodBoardKey('soccer98:board',week),id,score,name.trim());
    return accepted ? Response.json({saved:true,score}) : Response.json({error:'Match already submitted.'},{status:409});
  } catch { return Response.json({error:'Could not save your score. Please try again.'},{status:503}); }
}
