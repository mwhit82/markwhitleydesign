import type WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { advanceRoom, applyAction, applyPose, sweep } from './simulation';
import { parseAction } from './validation';
import { authenticated, publicRoom, type Repository } from './repository';
import { PROTOCOL, type CoopRoom } from './types';
/** One handler for Vercel and the local native WebSocket adapter. */
export function connectSocket(ws: WebSocket, code: string, repo: Repository) {
    let id = '', token = '', closed = false, busy = false, authenticating = false, lastPose = 0, lastHeartbeat = 0, leaseUntil = 0, leaseRetry = 0;
    let current: CoopRoom | null = null, unsubscribe: (() => void) | undefined;
    const owner = randomUUID(), poses = new Map<string, unknown>();
    let count = 0, bucket = Date.now();
    const send = (data: unknown) => { if (ws.readyState === 1 && ws.bufferedAmount < 512000)
        ws.send(JSON.stringify(data)); };
    const cleanup = () => { if (closed)
        return; closed = true; clearTimeout(authTimer); clearInterval(timer); unsubscribe?.(); if (id)
        void repo.change(code, r => { const p = r.members.find(p => p.id === id); if (p) {
            p.connected = false;
            p.seen = Date.now();
        } sweep(r,Date.now()); }).catch(() => { }); };
    const authTimer = setTimeout(() => ws.close(1008, 'Authentication required'), 5000);
    const timer = setInterval(() => {
        if (!id || busy || closed)
            return;
        busy = true;
        void (async () => {
            const now = Date.now();
            if (now - lastHeartbeat >= 3000) {
                lastHeartbeat = now;
                await repo.change(code, r => { if (closed)
                    return; if (!authenticated(r, id, token))
                    throw Error('Room expired'); const p = r.members.find(p => p.id === id)!; p.seen = now; p.connected = true; });
            }
            if (now >= leaseRetry) {
                leaseRetry = now + 700;
                leaseUntil = await repo.lease(code, owner) ? now + 1000 : 0;
            }
            if (now < leaseUntil) {
                const pending = new Map(poses);
                const latest = await repo.change(code, r => {
                    for (const [member, pose] of pending) {
                        const p = r.members.find(p => p.id === member);
                        if (p)
                            applyPose(p, pose as import('./types').Pose, now);
                    }
                    advanceRoom(r, now);
                });
                for (const [member, pose] of pending)
                    if (poses.get(member) === pose)
                        poses.delete(member);
                current = publicRoom(latest);
                await repo.publish(code, { type: 'room', room: current });
                if (latest.expired)
                    ws.close(1000, 'Room expired');
            }
        })().catch(e => { send({ type: 'error', error: e instanceof Error ? e.message : 'Connection interrupted' }); ws.close(1011, 'Reconnect'); }).finally(() => { busy = false; });
    }, 100);
    ws.on('close', cleanup);
    ws.on('error', cleanup);
    ws.on('message', raw => {
        void (async () => {
            const now = Date.now();
            if (now - bucket > 1000) {
                bucket = now;
                count = 0;
            }
            if (++count > 45)
                throw Error('Too many messages');
            const text = raw.toString();
            if (text.length > 24000)
                throw Error('Message too large');
            const m = JSON.parse(text);
            if (m.version !== PROTOCOL)
                throw Error('Game updated. Refresh to join.');
            if (!id) {
                if (authenticating)
                    return;
                authenticating = true;
                if (m.type !== 'hello' || typeof m.id !== 'string' || typeof m.token !== 'string' || m.token.length > 100)
                    throw Error('Join a room first.');
                const r = await repo.change(code, r => { sweep(r,now);if (!authenticated(r, m.id, m.token))
                    throw Error('Invalid membership.'); const p = r.members.find(p => p.id === m.id)!; if (now - p.seen >= 30000)
                    throw Error('Reconnect window expired.'); if(r.emptySince!==null){r.lastTick=now;r.emptySince=null;}p.seen = now; p.connected = true; });
                if (closed)
                    return;
                id = m.id;
                token = m.token;
                current = publicRoom(r);
                clearTimeout(authTimer);
                unsubscribe = await repo.subscribe(code, message => {
                    const event = message as {
                        type: string;
                        room?: CoopRoom;
                        member?: string;
                        pose?: unknown;run?:string;
                        to?: string;
                    };
                    if(event.type==='transport-error'){ws.close(1011,'Connection interrupted');return;}
                    if (event.type === 'room' && event.room){if(current?.world.encounters.runId!==event.room.world.encounters.runId)poses.clear();current = event.room;}
                    if (event.type === 'pose' && event.member && event.run===current?.world.encounters.runId)
                        poses.set(event.member, event.pose);
                    if (event.type === 'voice' && event.to !== id)
                        return;
                    send(event);
                });
                if (closed) {
                    unsubscribe();
                    return;
                }
                send({ type: 'room', room: current });
                return;
            }
            if (m.type === 'voice') {
                if (typeof m.to !== 'string' || !current?.members.some(p => p.id === m.to && p.connected) || m.to === id)
                    return;
                if (m.description && (!['offer', 'answer'].includes(m.description.type) || typeof m.description.sdp !== 'string' || m.description.sdp.length > 18000))
                    return;
                if (m.candidate && JSON.stringify(m.candidate).length > 3000)
                    return;
                await repo.publish(code, { type: 'voice', to: m.to, from: id, ready: m.ready === true ? true : undefined, description: m.description, candidate: m.candidate });
                return;
            }
            if (m.type !== 'action' || typeof m.id !== 'string' || m.id.length > 80 || typeof m.run !== 'string' || m.run.length > 160)
                throw Error('Invalid action');
            const action = parseAction(m.action);
            if (action.type === 'pose') {
                if(m.run!==current?.world.encounters.runId)return;
                if (now - lastPose < 65)
                    return;
                lastPose = now;
                const p = current?.members.find(p => p.id === id);
                if (!p || !p.alive || current?.paused || !applyPose(p, action.pose, now))
                    return;
                poses.set(id, action.pose);
                await repo.publish(code, { type: 'pose', member: id, pose: action.pose, run:m.run });
                return;
            }
            const r = await repo.change(code, r => { if (!authenticated(r, id, token))
                throw Error('Room expired'); const p = r.members.find(p => p.id === id)!; p.seen = now; p.connected = true; advanceRoom(r, now); applyAction(r, id, action, now, m.id, m.run); });
            current = publicRoom(r);
            await repo.publish(code, { type: 'room', room: current });
            if (action.type === 'leave')
                ws.close(1000, 'Left room');
        })().catch(e => { authenticating = false; send({ type: 'error', error: e instanceof Error ? e.message : 'Room unavailable' }); if (!id)
            ws.close(1008, 'Join failed'); });
    });
    return cleanup;
}
