import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { appearance, validName } from './validation';
import { newRoom, newMember, joinRoom, sweep } from './simulation';
import type { CoopRoom, Membership } from './types';
export type StoredRoom = CoopRoom & {
    secrets: Record<string, string>;
};
export type Repository = {
    read: (code: string) => Promise<StoredRoom | null>;
    create: (room: StoredRoom) => Promise<boolean>;
    change: (code: string, fn: (r: StoredRoom) => void) => Promise<StoredRoom>;
    publish: (code: string, message: unknown) => Promise<void>;
    subscribe: (code: string, receive: (message: unknown) => void) => Promise<() => void>;
    lease: (code: string, owner: string) => Promise<boolean>;
};
export const configured = () => !!((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
const db = () => new Redis({ url: (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)!, token: (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)! });
const key = (code: string) => `anomalous:room:v1:${code}`;
const channel = (code: string) => `anomalous:events:v1:${code}`;
export const publicRoom = (r: StoredRoom): CoopRoom => { const { secrets, ...room } = r; void secrets; return room; };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export const authenticated = (r: StoredRoom, id: string, token: string) => r.secrets[id] === digest(token) && r.members.some(p => p.id === id) && !r.expired;
export const redisRepository: Repository = {
    read: code => db().get<StoredRoom>(key(code)),
    create: async (r) => !!await db().set(key(r.code), JSON.stringify(r), { nx: true, ex: 1800 }),
    change: async (code, fn) => {
        const client = db();
        for (let i = 0; i < 8; i++) {
            const r = await client.get<StoredRoom>(key(code));
            if (!r)
                throw Error('Room expired. Create a new room.');
            const before = JSON.stringify(r);
            fn(r);
            r.revision++;
            const ok = await client.eval("if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',1800);return 1 end;return 0", [key(code)], [before, JSON.stringify(r)]);
            if (ok)
                return r;
        }
        throw Error('Room busy. Retry your action.');
    },
    publish: async (code, message) => { await db().publish(channel(code), message); },
    subscribe: async (code, receive) => { const sub = db().subscribe(channel(code)); sub.on('message', e => receive(e.message));sub.on('error',()=>receive({type:'transport-error'})); return () => { void sub.unsubscribe().catch(() => { }); }; },
    lease: async (code, owner) => !!await db().eval("if redis.call('GET',KEYS[1])==ARGV[1] or redis.call('EXISTS',KEYS[1])==0 then redis.call('SET',KEYS[1],ARGV[1],'PX',1500);return 1 end;return 0", [`${key(code)}:lease`], [owner]),
};
/** Local adapter and tests use the exact same transaction interface. */
export function memoryRepository(): Repository {
    const rooms = new Map<string, StoredRoom>(), listeners = new Map<string, Set<(m: unknown) => void>>(), leases = new Map<string, {
        owner: string;
        until: number;
    }>();
    return {
        read: async (code) => structuredClone(rooms.get(code) ?? null),
        create: async (r) => { if (rooms.has(r.code))
            return false; rooms.set(r.code, structuredClone(r)); return true; },
        change: async (code, fn) => { const value = rooms.get(code); if (!value)
            throw Error('Room expired.'); const r = structuredClone(value); fn(r); r.revision++; rooms.set(code, r); return structuredClone(r); },
        publish: async (code, m) => { for (const f of listeners.get(code) ?? [])
            f(structuredClone(m)); },
        subscribe: async (code, f) => { const set = listeners.get(code) ?? new Set(); listeners.set(code, set); set.add(f); return () => { set.delete(f); }; },
        lease: async (code, owner) => { const old = leases.get(code), now = Date.now(); if (old && old.owner !== owner && old.until > now)
            return false; leases.set(code, { owner, until: now + 1500 }); return true; },
    };
}
export async function enterRoom(repo: Repository, body: {
    name?: unknown;
    code?: unknown;
    appearance?: unknown;
    unlocked?: unknown;
}) {
    if (!validName(body.name))
        throw Error('Use a name of 2–20 letters or numbers.');
    const now = Date.now(), token = randomBytes(24).toString('hex'), id = randomUUID();
    const member = newMember(id, body.name.trim(), appearance(body.appearance), Math.max(1, Math.min(3, Number(body.unlocked) || 1)), now);
    if (body.code) {
        const code = String(body.code).trim().toUpperCase();
        if (!/^[A-Z2-9]{6}$/.test(code))
            throw Error('Enter the six-character room code.');
        const r = await repo.change(code, r => { sweep(r, now); member.pose.x = (r.members.length % 2) * 1.2 - .6; member.pose.z = 2.4 + Math.floor(r.members.length / 2) * 1.2; joinRoom(r, member); r.secrets[id] = digest(token); });
        await repo.publish(code, { type: 'room', room: publicRoom(r) });
        return { membership: { code, id, token } satisfies Membership, room: publicRoom(r) };
    }
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 8; i++) {
        const code = Array.from(randomBytes(6), n => alphabet[n % alphabet.length]).join('');
        const room = { ...newRoom(code, member, now), secrets: { [id]: digest(token) } };
        if (await repo.create(room))
            return { membership: { code, id, token } satisfies Membership, room: publicRoom(room) };
    }
    throw Error('Could not create room. Retry.');
}
export async function allowCreate(ip: string) { const bucket = `anomalous:limit:${digest(ip)}:${Math.floor(Date.now() / 60000)}`; return Number(await db().eval("local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],120) end;return n", [bucket], [])) <= 12; }
