import { experimental_upgradeWebSocket } from '@vercel/functions';
import { configured, redisRepository } from '@/lib/deader/multiplayer/repository';
import { connectSocket } from '@/lib/deader/multiplayer/socket';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function GET(request: Request) {
    if (request.headers.get('origin') !== new URL(request.url).origin || !configured())
        return new Response(null, { status: 403 });
    const code = new URL(request.url).searchParams.get('code') ?? '';
    if (!/^[A-Z2-9]{6}$/.test(code))
        return new Response(null, { status: 400 });
    return experimental_upgradeWebSocket(ws => { connectSocket(ws, code, redisRepository); }, { maxPayload: 24000 });
}
