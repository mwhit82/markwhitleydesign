import { configured, allowCreate, enterRoom, redisRepository } from '@/lib/deader/multiplayer/repository';
export const runtime = 'nodejs';
export async function POST(request: Request) {
    if (request.headers.get('origin') !== new URL(request.url).origin)
        return new Response(null, { status: 403 });
    if (!configured())
        return Response.json({ error: 'Multiplayer is not connected on this server. Solo play is available.' }, { status: 503 });
    try {
        if (!await allowCreate(request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown'))
            return Response.json({ error: 'Too many room requests. Try again shortly.' }, { status: 429 });
        const text = await request.text();
        if (text.length > 5000)
            return new Response(null, { status: 413 });
        return Response.json(await enterRoom(redisRepository, JSON.parse(text)), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : 'Room unavailable' }, { status: 400 });
    }
}
