import { randomUUID } from 'node:crypto';
import { configured, player, redis, rateLimit, sameOrigin } from '../../../../lib/rally/store';
import { validSelection } from '../../../../components/rally/stages';
import { validCar } from '../../../../lib/rally/validation';
export const runtime='nodejs';
export async function POST(request:Request) {
  if(!configured()) return Response.json({error:'Shared leaderboards are not connected yet. You can still race and save personal bests.'},{status:503});
  if(!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
  try {
    if(Number(request.headers.get('content-length'))>2048) return new Response(null,{status:413});
    const text=await request.text(); if(text.length>2048) return new Response(null,{status:413});
    const {selection,car}=JSON.parse(text);
    if(!validSelection(selection)||!validCar(car,selection)) return Response.json({error:'Invalid stage'},{status:400});
    const id=await player(true);
    if(!await rateLimit(id!,'start',12)) return Response.json({error:'Please wait before starting another ranked run.'},{status:429});
    const run=randomUUID();
    await redis('SET',`rally:run:${run}`,JSON.stringify({player:id,selection,car,started:Date.now()}),'EX',900);
    return Response.json({run});
  } catch { return Response.json({error:'Leaderboard connection unavailable. This run can still count as a personal best.'},{status:503}); }
}
