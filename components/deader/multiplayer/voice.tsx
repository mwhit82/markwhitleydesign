"use client";
import { useEffect } from 'react';
import type { ServerMessage } from '@/lib/deader/multiplayer/types';
import { listenVoice, sendVoice, useCoop } from '@/lib/deader/multiplayer/client';
const audioElements = new Map<string, HTMLAudioElement>();
export function setPeerVolume(id: string, volume: number) { const audio = audioElements.get(id); if (audio)
    audio.volume = Math.max(0, Math.min(1, volume)); }
/** At four seats a peer mesh needs at most three audio connections per player. */
export function CoopVoice() {
    const enabled = useCoop(s => s.voiceEnabled), membership = useCoop(s => s.membership), connected = useCoop(s => s.connected);
    useEffect(() => {
        if (!enabled || !membership || !connected)
            return;
        let stopped = false, stream: MediaStream | null = null, context: AudioContext | null = null, monitor: ReturnType<typeof setInterval> | undefined;
        const peers = new Map<string, {
            pc: RTCPeerConnection;
            making: boolean;
            ignore: boolean;
            pending: RTCIceCandidateInit[];
        }>();
        const status = (id: string, text: string) => {if(!stopped)useCoop.setState(s => ({ voicePeers: { ...s.voicePeers, [id]: text } }));};
        const make = (id: string) => {
            const existing = peers.get(id);
            if (existing)
                return existing;
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            const entry = { pc, making: false, ignore: false, pending: [] as RTCIceCandidateInit[] };
            peers.set(id, entry);
            for (const track of stream?.getTracks() ?? [])
                pc.addTrack(track, stream!);
            pc.onicecandidate = e => { if (e.candidate)
                sendVoice(id, { candidate: e.candidate.toJSON() }); };
            pc.ontrack = e => {
                let audio = audioElements.get(id);
                if (!audio) {
                    audio = new Audio();
                    audio.autoplay = true;
                    audioElements.set(id, audio);
                }
                audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
                void audio.play().catch(() => status(id, 'Tap Voice to enable audio'));
                if (context) {
                    const source = context.createMediaStreamSource(audio.srcObject as MediaStream), analyser = context.createAnalyser();
                    analyser.fftSize = 256;
                    sources.get(id)?.disconnect();analysers.get(id)?.disconnect();sources.set(id,source);
                    source.connect(analyser);
                    analysers.set(id, analyser);
                }
            };
            pc.onconnectionstatechange = () => status(id, pc.connectionState === 'failed' ? 'Voice unavailable on this network' : pc.connectionState);
            pc.onnegotiationneeded = async () => { try {
                entry.making = true;
                await pc.setLocalDescription();
                if (pc.localDescription)
                    sendVoice(id, { description: pc.localDescription.toJSON() });
            }
            catch {
                status(id, 'Voice unavailable');
            }
            finally {
                entry.making = false;
            } };
            status(id, 'Connecting');
            return entry;
        };
        const analysers = new Map<string, AnalyserNode>(),sources=new Map<string,MediaStreamAudioSourceNode>();
        const queued: Extract<ServerMessage, {
            type: 'voice';
        }>[] = [];
        const handle = async (message: Extract<ServerMessage, {
            type: 'voice';
        }>) => {
            if (stopped)
                return;
            if (!stream) {
                if (queued.length < 64)
                    queued.push(message);
                return;
            }
            if (message.ready) {
                const old = peers.get(message.from);
                if (old) {
                    old.pc.close();
                    peers.delete(message.from);
                }
                make(message.from);
                return;
            }
            const e = make(message.from), pc = e.pc, polite = membership.id > message.from;
            try {
                if (message.description) {
                    const collision = message.description.type === 'offer' && (e.making || pc.signalingState !== 'stable');
                    e.ignore = !polite && collision;
                    if (e.ignore)
                        return;
                    await pc.setRemoteDescription(message.description);
                    for (const c of e.pending.splice(0))
                        await pc.addIceCandidate(c);
                    if (message.description.type === 'offer') {
                        await pc.setLocalDescription();
                        sendVoice(message.from, { description: pc.localDescription!.toJSON() });
                    }
                }
                else if (message.candidate && !e.ignore) {
                    if (pc.remoteDescription)
                        await pc.addIceCandidate(message.candidate);
                    else
                        {if(e.pending.length<64)e.pending.push(message.candidate);}
                }
            }
            catch {
                status(message.from, 'Voice unavailable — Retry');
            }
        };
        const receive = listenVoice(message => { void handle(message); });
        const sync = () => {
            if (!stream || stopped)
                return;
            const s = useCoop.getState();
            stream.getAudioTracks().forEach(t => t.enabled = !s.muted);
            const ids = s.room?.members.filter(p => p.id !== membership.id && p.connected).map(p => p.id) ?? [];
            for (const id of ids)
                make(id);
            for (const [id, e] of peers)
                if (!ids.includes(id)) {
                    e.pc.close();
                    peers.delete(id);
                    audioElements.get(id)?.pause();
                    audioElements.delete(id);
                    analysers.get(id)?.disconnect();sources.get(id)?.disconnect();sources.delete(id);analysers.delete(id);
                }
        };
        const unsub = useCoop.subscribe(sync);
        void (navigator.mediaDevices ? navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }) : Promise.reject(Error('Microphone unavailable'))).then(s => {
            if (stopped) {
                s.getTracks().forEach(t => t.stop());
                return;
            }
            stream = s;
            context = new AudioContext();
            void context.resume();
            useCoop.setState({ voiceStatus: 'Voice on' });
            sync();
            for (const id of peers.keys())
                sendVoice(id, { ready: true });
            for (const message of queued.splice(0))
                void handle(message);
            monitor = setInterval(() => { const speaking: string[] = []; for (const [id, a] of analysers) {
                const data = new Uint8Array(a.fftSize);
                a.getByteTimeDomainData(data);
                if (data.some(n => Math.abs(n - 128) > 8))
                    speaking.push(id);
            } const before = useCoop.getState().speaking; if (before.join() !== speaking.join())
                useCoop.setState({ speaking }); }, 200);
        }).catch(() => {if(!stopped)useCoop.setState({ voiceStatus: 'Microphone unavailable. Signals still work.' });});
        return () => { stopped = true; unsub(); receive(); clearInterval(monitor); stream?.getTracks().forEach(t => t.stop()); for (const e of peers.values())
            e.pc.close(); audioElements.forEach(a => { a.pause(); a.srcObject = null; }); audioElements.clear();sources.forEach(s=>s.disconnect());analysers.forEach(a=>a.disconnect()); void context?.close(); };
    }, [enabled, membership, connected]);
    return null;
}
