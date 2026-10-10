import { cookies } from 'next/headers';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
export const configured = () => Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
export async function redis<T>(...command:(string|number)[]):Promise<T> {
  if(!configured()) throw new Error('Leaderboard not connected');
  const response=await fetch(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!,{method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(command),cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error('Leaderboard unavailable');
  const payload=await response.json(); if(payload.error) throw new Error('Leaderboard unavailable');
  return payload.result as T;
}
function signature(id:string) { return createHmac('sha256',process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!).update(id).digest('hex'); }
export async function player(create=false) {
  const jar=await cookies();
  const cookie=jar.get('rally-player')?.value || '';
  const [id,sig]=cookie.split('.');
  if(id && /^[a-f0-9-]{36}$/.test(id) && /^[a-f0-9]{64}$/.test(sig || '') && timingSafeEqual(Buffer.from(sig),Buffer.from(signature(id)))) return id;
  if(!create) return null;
  const fresh=randomUUID();
  jar.set('rally-player',`${fresh}.${signature(fresh)}`,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api/rally',maxAge:31536000});
  return fresh;
}
export function sameOrigin(request:Request) { const origin=request.headers.get('origin'); return origin===new URL(request.url).origin; }
export async function rateLimit(id:string,kind:string,max:number) {
  const key=`rally:limit:${kind}:${id}:${Math.floor(Date.now()/60000)}`;
  const n=await redis<number>('EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n",1,key);
  return n<=max;
}
