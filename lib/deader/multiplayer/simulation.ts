/** Server-owned shared night. Reuses the same pure rules as the solo adapter. */
import { freshRoom, transitionDoor } from '../room';
import { validVRTeleport } from '../vr';
import { createSession } from '../game';
import { advanceNight, arrivalPlan, scheduledVisitor, infiniteInterval, nightRate } from '../night';
import { tickEncounters, resolveEncounter, askQuestion, QUESTIONS, visitorById, recordResidentShot } from '../visitors';
import { admitResident, advanceMimics, cancelMimics, tickResidents, residentPosition } from '../lounge';
import { freshKitchen, kitchenAction, kitchenBeforeDawn, roomFloor } from '../kitchen';
import { freshWeapon, spendShot, beginJudgement, processionEntries, tickJudgement, judgementDuration } from '../judgement';
import { freshStalker, tickStalker, dismissStalker, emptyStalkerSight, STALKER_ROOM } from '../stalker';
import { newsForNight, broadcastDuration } from '../room';
import { loopBroadcast } from '../tv';
import { CAPACITY, PROTOCOL, RECONNECT_MS, SIGNALS, type CoopRoom, type Member, type Action, type Appearance, type Pose } from './types';
export const spawnPose = (seat: number): Pose => ({ x: (seat % 2) * 1.2 - .6, z: 2.4 + Math.floor(seat / 2) * 1.2, yaw: 0, pitch: 0, view: 'explore', feed: 0 });
export function newMember(id: string, name: string, appearance: Appearance, unlocked: number, now: number, seat = 0): Member {
    return { id, name, appearance, unlocked, joined: now, seen: now, connected: true, ready: false, alive: true, pose: spawnPose(seat), kitchen: freshKitchen(), weapon: freshWeapon(), lastAction: 0, lastSignal: 0, lastPose: now, sequences: [] };
}
export function newRoom(code: string, member: Member, now: number): CoopRoom {
    return { version: PROTOCOL, code, host: member.id, revision: 0, phase: 'lobby', paused: false, settings: { difficulty: 'easy', mode: 'normal', night: 1 }, members: [member], world: freshRoom(), lastTick: now, emptySince: null, doorSeconds: 0, signals: [], receipts: [], stalkerTarget: null, expired: false };
}
export function joinRoom(r: CoopRoom, m: Member) {
    if (r.expired || r.phase === 'playing')
        throw Error('Join between nights.');
    if (r.members.length >= CAPACITY)
        throw Error('Room full — four players maximum.');
    r.members.push(m);
    if(r.settings.mode==='normal')r.settings.night=Math.min(r.settings.night,m.unlocked);
    r.members.forEach(p => p.ready = false);
}
export function sweep(r: CoopRoom, now: number) {
    for (const p of r.members)
        if (now - p.seen > 8000)
            p.connected = false;
    r.members = r.members.filter(p => now - p.seen < RECONNECT_MS);
    const connected = r.members.filter(p => p.connected);
    if (!connected.some(p => p.id === r.host) && connected.length)
        r.host = connected.sort((a, b) => a.joined - b.joined)[0].id;
    if (!connected.length) {
        r.emptySince ??= now;
        if (!r.members.length || now - r.emptySince >= RECONNECT_MS)
            r.expired = true;
    }
    else
        r.emptySince = null;
}
const near = (p: Member, x: number, z: number, radius = 2.4) => Math.hypot(p.pose.x - x, p.pose.z - z) <= radius;
const atDoor = (p: Member) => near(p, .25, -3.1) || near(p, -2.7, .7, 3);
export function validPose(p: Pose): boolean {
    return !!p && [p.x, p.z, p.yaw, p.pitch, p.feed].every(Number.isFinite) && roomFloor(p) && Math.abs(p.yaw) <= Math.PI * 2 && Math.abs(p.pitch) <= 1.6 && Number.isInteger(p.feed) && p.feed >= 0 && p.feed <= 5 && ['explore', 'door', 'inspect', 'cctv', 'console', 'fridge', 'oven', 'tv', 'lounge-tv', 'arcade', 'news', 'donut', 'vent'].includes(p.view) && [p.head, p.left, p.right].every(v => v === undefined || (Array.isArray(v) && v.length === 7 && v.every(Number.isFinite) && v.slice(0, 3).every(n => Math.abs(n) < 25) && v.slice(3).every(n => Math.abs(n) <= 1.01)));
}
function aimedAt(p: Pose, dx: number, dz: number) {
    const length = Math.max(.01, Math.hypot(dx, dz));
    if ((-Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz) / length >= .8)
        return true;
    return [p.left, p.right].some(v => { if (!v || Math.hypot(v[0] - p.x, v[2] - p.z) > 2.5)
        return false; const [x, y, z, w] = v.slice(3), fx = -2 * (x * z + w * y), fz = -(1 - 2 * (x * x + y * y)); return (fx * dx + fz * dz) / Math.max(.01, Math.hypot(fx, fz) * length) >= .8; });
}
export function applyPose(p: Member, pose: Pose, now: number) {
    if (!validPose(pose))
        return false;
    const elapsed = Math.max(.1, Math.min(2, (now - p.lastPose) / 1000));
    if (Math.hypot(pose.x - p.pose.x, pose.z - p.pose.z) > elapsed * 5 + .6) {
        if (!pose.head || now - (p.lastTeleport ?? 0) < 700 || Math.hypot(pose.x - p.pose.x, pose.z - p.pose.z) > 5 || !validVRTeleport(p.pose, pose, roomFloor))
            return false;
        p.lastTeleport = now;
    }
    p.pose = pose;
    p.lastPose = now;
    return true;
}
function fail(r: CoopRoom) { if (r.settings.mode === 'infinite')
    r.settings.night = 1; r.phase = 'results'; if (r.world.night)
    r.world.night.status = 'failed'; r.world.encounters.active = null; r.world.judgement = null; r.world.survival.phase = 'gameover'; r.members.forEach(p => p.ready = false); }
function start(r: CoopRoom, now: number, run: string) {
    if (r.phase === 'playing' || !r.members.length || r.members.some(p => !p.connected || !p.ready))
        throw Error('Everyone must be ready.');
    const session = { ...createSession(r.settings.difficulty, r.settings.mode), night: r.settings.night };
    r.world = freshRoom(run, 300, session);
    if (session.mode === 'infinite' && r.world.night) {
        r.world.night.elapsed = (session.night - 1) * 600;
        r.world.night.nextArrival = r.world.night.elapsed + 12;
    }
    r.phase = 'playing';
    r.paused = false;
    r.lastTick = now;
    r.doorSeconds = 0;
    r.stalkerTarget = null;
    r.members.forEach((p, i) => { p.alive = true; p.ready = false; p.kitchen = freshKitchen(); p.weapon = freshWeapon(); p.pose = spawnPose(i); p.lastPose = now; });
}
export function applyAction(r: CoopRoom, id: string, a: Action, now: number, requestId: string, run: string) {
    const p = r.members.find(p => p.id === id);
    if (!p || r.expired)
        throw Error('Room membership expired.');
    if (p.sequences.includes(requestId))
        return;
    p.sequences = [...p.sequences.slice(-63), requestId];
    if (a.type === 'leave') {
        r.members = r.members.filter(x => x.id !== id);
        sweep(r, now);
        return;
    }
    if (a.type === 'pose') {
        applyPose(p, a.pose, now);
        return;
    }
    if (a.type === 'signal') {
        if (SIGNALS.includes(a.text) && now - p.lastSignal >= 1500) {
            p.lastSignal = now;
            r.signals = [...r.signals.slice(-7), { id: requestId, member: id, text: a.text, at: now }];
        }
        return;
    }
    if(a.type==='appearance'){p.appearance=a.appearance;return;}
    if (a.type === 'ready') {
        if (r.phase !== 'playing')
            p.ready = !!a.ready;
        return;
    }
    if (a.type === 'configure') {
        if (id !== r.host || r.phase === 'playing')
            throw Error('Only the host can set up a night.');
        if (!['easy', 'medium', 'hard'].includes(a.difficulty) || !['normal', 'infinite'].includes(a.mode) || !Number.isInteger(a.night) || a.night < 1 || a.night > Math.min(3, ...r.members.map(m => m.unlocked)))
            throw Error('Choose an unlocked night.');
        r.settings = { difficulty: a.difficulty, mode: a.mode, night: a.mode === 'infinite' ? 1 : a.night };
        r.members.forEach(m => m.ready = false);
        return;
    }
    if (a.type === 'start') {
        if (id !== r.host)
            throw Error('Only the host starts the night.');
        start(r, now, `${r.code}:${requestId}`);
        return;
    }
    if (a.type === 'pause') {
        if (id !== r.host || r.phase !== 'playing')
            return;
        r.paused = !!a.paused;
        r.lastTick = now;
        return;
    }
    if (run !== r.world.encounters.runId || !p.alive || !p.connected || r.paused || r.phase !== 'playing' || r.world.judgement)
        return;
    const w = r.world, e = w.encounters.active;
    if (a.type === 'question') {
        if (atDoor(p) && QUESTIONS.some(q => q.id === a.question))
            w.encounters = askQuestion(w.encounters, a.visitor, a.question);
        return;
    }
    if (a.type === 'decision') {
        if (!atDoor(p) || !e || e.id !== a.visitor || e.phase !== 'waiting' || !['admit', 'reject'].includes(a.decision))
            return;
        const next = resolveEncounter(w.encounters, e.id, a.decision);
        if (next === w.encounters)
            return;
        w.residents = advanceMimics(w.residents, e.id);
        if (a.decision === 'admit')
            w.residents = admitResident(w.residents, e.id, e.visitor, e.profile);
        r.world = transitionDoor({ ...w, door: 'VISITOR_WAITING', encounters: next }, { type: a.decision === 'admit' ? 'open-confirmed' : 'reject' });
        r.world.view = 'explore';
        r.doorSeconds = 0;
        return;
    }
    if (a.type === 'kitchen') {
        const fridge = ['food', 'drink'].includes(a.action);
        if (!near(p, 7.1, fridge ? 6 : 8, 2.6))
            return;
        const k = kitchenAction({ ...p.kitchen, oven: w.kitchen.oven, seconds: w.kitchen.seconds }, a.action);
        p.kitchen = k;
        w.kitchen = { ...w.kitchen, oven: k.oven, seconds: k.seconds };
        return;
    }
    if (a.type === 'weapon') {
        if (near(p, -3.45, 1.65, 2.4)) {
            p.weapon.collected = !!a.collect;
        }
        return;
    }
    if (a.type === 'aim') {
        if (p.weapon.collected && near(p, .25, -3.1) && e?.phase === 'waiting') {
            w.door = 'OPENING';
            r.doorSeconds = 0;
        }
        return;
    }
    if (a.type === 'observe') {
        if (!Number.isInteger(a.anchor) || a.anchor < -1 || a.anchor >= STALKER_ROOM.length)
            return;
        if (a.camera && p.pose.view === 'cctv' && p.pose.feed === w.stalker.feed)
            w.stalkerSight.camera = true;
        if (a.gaze && p.pose.view === 'explore')
            w.stalkerSight.gaze = true;
        if (r.stalkerTarget === id || !r.stalkerTarget)
            w.stalkerSight.anchor = a.anchor;
        return;
    }
    if (a.type === 'shoot') {
        if (p.pose.view !== 'explore')
            return;
        const weapon = spendShot(p.weapon);
        if (weapon === p.weapon)
            return;
        p.weapon = weapon;
        const target = a.target;
        if (!target || w.weapon.removed.includes(target))
            return;
        if (target === 'stalker') {
            const anchor=STALKER_ROOM[w.stalker.anchor];
            if (w.stalker.phase === 'room'&&anchor&&Math.hypot(anchor.p[0]-p.pose.x,anchor.p[2]-p.pose.z)<14&&aimedAt(p.pose,anchor.p[0]-p.pose.x,anchor.p[2]-p.pose.z))
                w.stalker = dismissStalker(w.stalker);
            return;
        }
        const resident = w.residents.find(v => v.id === target), pos = resident ? residentPosition(resident) : { x: .25, y: .9, z: -5 };
        const dx = pos.x - p.pose.x, dz = pos.z - p.pose.z, len = Math.hypot(dx, dz);
        if (len > 14 || !Array.from({ length: Math.max(1, Math.ceil(len / .15)) }, (_, i) => { const t = i / Math.max(1, Math.ceil(len / .15)); const z = p.pose.z + dz * t; return z < -3.4 ? Math.abs(p.pose.x + dx * t - .25) < .8 && w.door === 'OPEN' : roomFloor({ x: p.pose.x + dx * t, z }); }).every(Boolean) || !aimedAt(p.pose, dx, dz))
            return;
        if (e?.id === target && e.phase === 'waiting' && w.door === 'OPEN') {
            w.encounters = resolveEncounter(w.encounters, target, 'shoot');
            w.encounters.active = null;
            w.door = 'CLOSING';
            w.visitorId = null;
            w.residents = advanceMimics(w.residents, target);
            if (w.night)
                w.night.nextArrival = Math.max(w.night.nextArrival, w.night.elapsed + 10);
        }
        else if (resident) {
            const v = resident.profile ?? visitorById(resident.visitor);
            w.residents = w.residents.filter(x => x.id !== target);
            w.encounters.ledger = recordResidentShot(w.encounters.ledger, target, v);
            if (v.kind === 'human') {
                w.encounters.mistakes++;
                w.encounters.trust = Math.max(0, w.encounters.trust - 1);
            }
        }
        else
            return;
        w.weapon.removed.push(target);
        r.doorSeconds = 0;
    }
}
function step(r: CoopRoom, dt: number) {
    const w = r.world, n = w.night;
    if (!n || r.phase !== 'playing')
        return;
    if (w.kitchen.failure === 'fire') {
        w.kitchen.fireSeconds = Math.min(3, w.kitchen.fireSeconds + dt);
        if (w.kitchen.fireSeconds >= 3)
            fail(r);
        return;
    }
    if (w.judgement) {
        w.judgement = tickJudgement(w.judgement, dt);
        if (w.judgement.elapsed >= judgementDuration(w.judgement)) {
            const passed = !w.judgement.failed, id = `coop:${w.encounters.runId}:${n.number}`;
            if (!r.receipts.some(x => x.id === id))
                r.receipts.push({ id, coins: w.encounters.ledger.reduce((sum, x) => sum + x.coins, 0) + (passed ? 50 : 0), night: n.number, difficulty: n.difficulty, mode: n.mode, passed, members: r.members.map(p => p.id) });
            r.receipts = r.receipts.slice(-20);
            r.phase = 'results';
            n.status = passed ? 'completed' : 'failed';
            w.judgement = null;
            r.members.forEach(p => p.ready = false);
            if (passed) {
                r.members.forEach(p => p.unlocked = Math.min(3, Math.max(p.unlocked, n.number + 1)));
                r.settings.night = n.mode === 'normal' ? Math.min(3, n.number + 1) : n.number + 1;
            }
            else {
                w.survival.phase = 'gameover';
                if (n.mode === 'infinite')
                    r.settings.night = 1;
            }
        }
        return;
    }
    const until = ((n.mode === 'infinite' ? n.number * 600 : 600) - n.elapsed) / nightRate(n);
    for (const p of r.members) {
        p.weapon.cooldown = Math.max(0, p.weapon.cooldown - dt);
        if (!p.alive)
            continue;
        p.kitchen = kitchenBeforeDawn({ ...p.kitchen, oven: w.kitchen.oven, seconds: w.kitchen.seconds }, dt, until);
        if (p.kitchen.failure)
            p.alive = false;
    }
    const oven = kitchenBeforeDawn({ ...w.kitchen, hunger: 100, thirst: 100 }, dt, until);
    w.kitchen = oven;
    if (oven.failure === 'fire') {
        r.members.forEach(p => p.alive = false);
        return;
    }
    if (!r.members.some(p => p.alive)) {
        fail(r);
        return;
    }
    w.night = advanceNight(n, dt, false, w.encounters.trust);
    if (w.night.status === 'judging') {
        w.judgement = { ...beginJudgement(w.encounters.mistakes - w.mistakeBaseline), entries: processionEntries(w.encounters.ledger) };
        w.kitchen.oven = 'off';
        w.kitchen.seconds = 0;
        w.encounters.active = null;
        w.encounters.queued = null;
        w.encounters.pair = undefined;
        w.door = 'CLOSED';
        w.visitorId = null;
        w.residents = cancelMimics(w.residents);
        w.stalker = freshStalker(n.number);
        return;
    }
    r.doorSeconds += dt;
    if (w.door === 'OPENING' && r.doorSeconds >= .7) {
        w.door = 'OPEN';
        r.doorSeconds = 0;
    }
    if (w.door === 'CLOSING' && r.doorSeconds >= .7) {
        w.door = w.encounters.active?.phase === 'waiting' ? 'VISITOR_WAITING' : 'CLOSED';
        r.doorSeconds = 0;
    }
    const old = w.encounters, plan = arrivalPlan(w.night, old);
    w.encounters = tickEncounters(old, dt, n.difficulty, old.active?.phase === 'departing' && old.active.decision === 'admit' && w.door !== 'OPEN', w.door === 'CLOSED' || w.door === 'VISITOR_WAITING', { rate: nightRate(n), scheduled: scheduledVisitor(w.night, old), companion: plan.companion, push: plan.push });
    if (old.sequence !== w.encounters.sequence)
        w.night.nextArrival = w.night.elapsed + infiniteInterval(w.night);
    if (old.active?.phase === 'approaching' && w.encounters.active?.phase === 'waiting') {
        w.door = 'VISITOR_WAITING';
        w.visitorId = w.encounters.active.id;
    }
    if (old.active?.phase === 'departing' && !w.encounters.active) {
        w.night.nextArrival = Math.max(w.night.nextArrival, w.night.elapsed + 10);
        if (w.door === 'OPEN') {
            w.door = 'CLOSING';
            r.doorSeconds = 0;
        }
    }
    if (w.encounters.result?.decision === 'timeout' && w.encounters.result !== old.result) {
        w.residents = advanceMimics(w.residents, w.encounters.result.id);
        w.visitorId = null;
        w.door = 'CLOSING';
        r.doorSeconds = 0;
    }
    w.residents = tickResidents(w.residents, dt, w.door === 'OPEN');
    const report = newsForNight(n.number);
    w.newsSeconds = loopBroadcast(w.newsSeconds, dt, broadcastDuration(report));
    const alive = r.members.filter(p => p.alive && p.connected);
    if (!alive.some(p => p.id === r.stalkerTarget))
        r.stalkerTarget = alive[0]?.id ?? null;
    w.stalker = tickStalker(w.stalker, dt, { seed: w.encounters.runId, shift: n.number, seconds: (n.elapsed - (n.mode === 'infinite' ? (n.number - 1) * 600 : 0)) * n.duration / 600, running: true, paused: false, defer: !!w.encounters.active || w.residents.some(v => v.attackSeconds !== undefined), exploring: alive.some(p => p.pose.view === 'explore'), sight: w.stalkerSight });
    w.stalkerSight = emptyStalkerSight();
}
export function advanceRoom(r: CoopRoom, now: number) {
    now=Math.max(now,r.lastTick);
    sweep(r, now);
    r.signals = r.signals.filter(s => now - s.at < 8000);
    const elapsed = Math.max(0, Math.min(2, (now - r.lastTick) / 1000));
    r.lastTick = now;
    if (r.expired || r.paused || r.emptySince !== null)
        return;
    let left = elapsed;
    while (left > 1e-6) {
        const dt = Math.min(.1, left);
        step(r, dt);
        left -= dt;
    }
}
