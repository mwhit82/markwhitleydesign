"use client";
import { create } from 'zustand';
import { useGame } from '../store';
import { cosmetics, reward, createSession } from '../game';
import { unlockedNight, recordStory } from '../progression';
import { unlockAchievements } from '../achievements';
import { writeLocalSave } from '../persistence';
import { type RoomView } from '../room';
import { type CoopRoom, type Membership, type Action, type ServerMessage, type Pose, PROTOCOL } from './types';
export const useCoop = create<{
    membership: Membership | null;
    room: CoopRoom | null;
    connected: boolean;
    joining:boolean;
    error: string | null;
    voiceEnabled: boolean;
    voiceStatus: string;
    voicePeers: Record<string, string>;
    muted: boolean;
    speaking: string[];
    spectating: string | null;
}>(() => ({ membership: null, room: null, connected: false, joining:false, error: null, voiceEnabled: false, voiceStatus: 'Voice off', voicePeers: {}, muted: false, speaking: [], spectating: null }));
let socket: WebSocket | null = null, retry: ReturnType<typeof setTimeout> | undefined, restore: (() => void) | null = null, generation = 0, attempt = 0;
export const remotePoses = new Map<string, Pose>();
const voiceListeners = new Set<(m: Extract<ServerMessage, {
    type: 'voice';
}>) => void>();
export const listenVoice = (f: (m: Extract<ServerMessage, {
    type: 'voice';
}>) => void) => { voiceListeners.add(f); return () => { voiceListeners.delete(f); }; };
export function sendVoice(to: string, payload: {
    ready?: true;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
}) { if (socket?.readyState === 1)
    socket.send(JSON.stringify({ version: PROTOCOL, type: 'voice', to, ...payload })); }
function base() { return process.env.NODE_ENV === 'development' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : location.origin; }
export function sendAction(action: Action) {
    const s = useCoop.getState();
    if (!s.connected || socket?.readyState !== 1)
        return false;
    socket.send(JSON.stringify({ version: PROTOCOL, type: 'action', id: crypto.randomUUID(), run: s.room?.world.encounters.runId ?? '', action }));
    return true;
}
export function localCanAct() { const c = useCoop.getState(), s = useGame.getState(), p = c.room?.members.find(p => p.id === c.membership?.id); return !!(c.connected && p?.alive && !c.room?.paused && !s.panel && !s.suspension && s.focused); }
function installAdapter() {
    if (restore)
        return;
    const original = useGame.getState();
    const names = ['tickVisitors', 'doorEvent', 'askVisitor', 'decideVisitor', 'decideVisitorVR', 'useKitchen', 'collectWeapon', 'returnWeapon', 'aimDoor', 'fireWeapon', 'advanceDawn', 'start', 'nextNight', 'lobby', 'roomView'] as const;
    const saved = Object.fromEntries(names.map(k => [k, original[k]]));
    const localView = (view: RoomView) => { useGame.setState(s => ({ room: { ...s.room, view }, prompt: null })); };
    const decision = (visitor: string, decision: 'admit' | 'reject') => { if (localCanAct() && sendAction({ type: 'decision', visitor, decision }))
        localView('explore'); };
    useGame.setState({
        tickVisitors: () => { }, advanceDawn: () => { },
        doorEvent: event => {
            if (!localCanAct())
                return;
            if (event.type === 'inspect') {
                localView('inspect');
                return;
            }
            if (event.type === 'leave-inspection') {
                localView('door');
                return;
            }
            const e = useGame.getState().room.encounters.active;
            if (e && (event.type === 'open-confirmed' || event.type === 'reject'))
                decision(e.id, event.type === 'reject' ? 'reject' : 'admit');
        },
        roomView: view => { if (!localCanAct() || view === 'arcade')
            return; localView(view); },
        askVisitor: (visitor, question) => { if (localCanAct())
            sendAction({ type: 'question', visitor, question }); },
        decideVisitor: (visitor, d) => { if (d === 'admit' || d === 'reject')
            decision(visitor, d); },
        decideVisitorVR: (visitor, d) => decision(visitor, d),
        useKitchen: action => { if (localCanAct())
            sendAction({ type: 'kitchen', action }); },
        collectWeapon: () => { if (localCanAct())
            sendAction({ type: 'weapon', collect: true }); },
        returnWeapon: () => { if (localCanAct())
            sendAction({ type: 'weapon', collect: false }); },
        aimDoor: () => { if (localCanAct()) {
            sendAction({ type: 'aim' });
            localView('explore');
        } },
        fireWeapon: target => localCanAct() && sendAction({ type: 'shoot', target }),
        start: () => { useGame.getState().open('coop'); }, nextNight: () => { useGame.getState().open('coop'); },
        lobby: () => { leaveCoop(); },
    });
    restore = () => { useGame.setState(saved); restore = null; };
}
function applySnapshot(room: CoopRoom) {
    const c = useCoop.getState();
    if (c.room && room.code === c.room.code && room.revision < c.room.revision)
        return;
    const self = room.members.find(p => p.id === c.membership?.id);
    if (!self || room.expired) {
        leaveCoop();
        useCoop.setState({ error: 'Room ended or your reconnect window expired.' });
        return;
    }
    const old = useGame.getState(), newRun = old.room.encounters.runId !== room.world.encounters.runId;
    useCoop.setState({ room, connected: true, error: null });
    if(newRun)remotePoses.clear();
    for (const p of room.members)
        if (!remotePoses.has(p.id))
            remotePoses.set(p.id, p.pose);
    for (const id of remotePoses.keys())
        if (!room.members.some(p => p.id === id))
            remotePoses.delete(id);
    if (room.phase === 'lobby')
        return;
    let save = old.save;
    for (const receipt of room.receipts) {
        if (!receipt.members.includes(self.id) || save.claimedRewards.includes(receipt.id))
            continue;
        save = reward(save, receipt.id, receipt.coins, receipt.passed && receipt.mode === 'normal' ? receipt.night : 0);
        if (receipt.passed && receipt.mode === 'normal')
            save = recordStory(save, receipt.night, receipt.difficulty);
        save = unlockAchievements(save);
    }
    let storageFailed = old.storageFailed;
    if (save !== old.save)
        try {
            storageFailed = !writeLocalSave(localStorage, save);
        }
        catch {
            storageFailed = true;
        }
    const spectator = !self.alive && room.phase === 'playing';
    const kitchen = { ...self.kitchen, oven: room.world.kitchen.oven, seconds: room.world.kitchen.seconds, fireSeconds:room.world.kitchen.fireSeconds, failure: room.world.kitchen.failure === 'fire' ? 'fire' as const : spectator ? null : self.kitchen.failure };
    useGame.setState({ save, storageFailed, scene: 'room', tutorial: null, session: { ...createSession(room.settings.difficulty, room.settings.mode), night: room.world.night?.number ?? room.settings.night },
        panel: room.phase === 'results' && c.room?.phase !== 'results' ? 'coop' : newRun ? null : old.panel, prompt: spectator ? null : old.prompt,
        room: { ...room.world, view: newRun ? 'explore' : old.room.view, feed: old.room.feed, stalkerSight: old.room.stalkerSight, kitchen, weapon: { ...self.weapon, collected:self.alive&&self.weapon.collected, removed: room.world.weapon.removed } },
    });
}
function connect(membership: Membership, epoch: number) {
    if (epoch !== generation)
        return;
    const ws = new WebSocket(`${base().replace(/^http/, 'ws')}/api/deader/rooms/socket?code=${membership.code}`);
    socket = ws;
    ws.onopen = () => { attempt = 0; ws.send(JSON.stringify({ version: PROTOCOL, type: 'hello', id: membership.id, token: membership.token })); };
    ws.onmessage = event => {
        if (epoch !== generation)
            return;
        try {
            const m = JSON.parse(event.data) as ServerMessage;
            if (m.type === 'room')
                applySnapshot(m.room);
            else if (m.type === 'pose'&&m.run===useCoop.getState().room?.world.encounters.runId)
                remotePoses.set(m.member, m.pose);
            else if (m.type === 'voice')
                voiceListeners.forEach(f => f(m));
            else if (m.type === 'error')
                useCoop.setState({ error: m.error });
        }
        catch {
            useCoop.setState({ error: 'Could not read the shared session. Reconnecting…' });
            ws.close();
        }
    };
    ws.onclose = event => {
        if (epoch !== generation)
            return;
        useCoop.setState({ connected: false });
        if (event.code === 1008 || event.reason === 'Room expired' || event.reason === 'Left room') {
            leaveCoop();
            useCoop.setState({ error: event.reason || 'Room closed.' });
            return;
        }
        retry = setTimeout(() => connect(membership, epoch), Math.min(4000, 400 * 2 ** attempt++));
    };
    ws.onerror = () => { useCoop.setState({ error: 'Connection interrupted. Reconnecting…' }); };
}
export async function enterCoop(name: string, code?: string) {
    if(useCoop.getState().joining||useCoop.getState().membership)return false;
    useCoop.setState({ error: null, joining:true });
    const save = useGame.getState().save;
    try {
        const response = await fetch(`${base()}/api/deader/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code, unlocked: unlockedNight(save), appearance: { colour: cosmetics.find(c => c.id === save.equipped)!.colour, outfit: save.outfit, pet: save.equippedPet } }) });
        const data = await response.json();
        if (!response.ok)
            throw Error(data.error || 'Unable to join room.');
        const membership = data.membership as Membership;
        try{sessionStorage.setItem('anomalous-coop', JSON.stringify(membership));}catch{/* Private storage can be unavailable; the live session still works. */}
        installAdapter();
        useCoop.setState({ membership, room: data.room });
        connect(membership, ++generation);
        return true;
    }
    catch (e) {
        useCoop.setState({ error: e instanceof Error ? e.message : 'Multiplayer is unavailable.' });
        return false;
    } finally {useCoop.setState({joining:false});}
}
export function resumeCoop() {
    if (useCoop.getState().membership)
        return;
    try {
        const raw = sessionStorage.getItem('anomalous-coop');
        if (!raw)
            return;
        const m = JSON.parse(raw) as Membership;
        if (!/^[A-Z2-9]{6}$/.test(m.code) || !m.id || !m.token)
            return;
        installAdapter();
        useCoop.setState({ membership: m });
        connect(m, ++generation);
    }
    catch { /* No saved connection. */ }
}
export function leaveCoop() {
    sendAction({ type: 'leave' });
    generation++;
    clearTimeout(retry);
    socket?.close();
    socket = null;
    try{sessionStorage.removeItem('anomalous-coop');}catch{/* Connection cleanup must not depend on storage. */}
    restore?.();
    remotePoses.clear();
    useCoop.setState({ membership: null, room: null, connected: false, voiceEnabled: false, voiceStatus: 'Voice off', voicePeers:{}, speaking:[], spectating: null });
    useGame.getState().lobby();
}
