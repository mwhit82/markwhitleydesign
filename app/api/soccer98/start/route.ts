import { randomUUID, randomInt } from 'node:crypto';
import { configured, player, redis, rateLimit, sameOrigin } from '@/lib/soccer98/store';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Invalid origin.'},{status:403});
  if (!configured()) return Response.json({error:'Leaderboards unavailable. You can still play.'},{status:503});
  try {
    const id = await player(true);
    if (!await rateLimit(id!, 'start', 20)) return Response.json({error:'Too many kick-offs. Try again shortly.'},{status:429});
    const run = randomUUID(), seed = randomInt(0, 4294967296);
    await redis('SET', `soccer98:run:${run}`, JSON.stringify({player:id, seed, started:Date.now()}), 'EX', 86400);
    return Response.json({run,seed},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Leaderboards unavailable. You can still play.'},{status:503}); }
}
