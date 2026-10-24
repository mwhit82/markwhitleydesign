import { useGame } from '../../../lib/deader/store';
import { useCoop, enterCoop, leaveCoop, sendAction } from '../../../lib/deader/multiplayer/client';
import { SIGNALS } from '../../../lib/deader/multiplayer/types';
import type { VRMenuState, VRScreen, VRButton } from '../../../lib/deader/vr-menu';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Four large rows retain the headset's existing controller layout. */
export function coopVRScreen(m: VRMenuState): VRScreen | null {
    const s = useGame.getState(), c = useCoop.getState();
    if (s.panel !== 'coop')
        return null;
    const r = c.room, self = r?.members.find(p => p.id === c.membership?.id), host = r?.host === self?.id;
    const nav = (page: string) => () => { m.page = page; m.index = 0; };
    const b = (text: string, run: () => void, disabled = false): VRButton => ({ text, run, disabled:disabled||c.joining });
    const screen = (title: string, body: string, buttons: VRButton[], back?: () => void): VRScreen => ({ title, body, buttons, back, close: () => s.open(null) });
    const nickname = `Player ${Math.floor(Math.random() * 900 + 100)}`;
    if (!c.membership) {
        const codeText=`${m.answer.padEnd(6,'_')} · ${c.error??'Choose the room code.'}`;
        if(m.page==='join-letters')return screen('Room code',codeText,alphabet.slice(m.index,m.index+4).split('').map(char=>b(char,()=>{m.answer+=char;m.page='join';m.index=0;})),()=>{m.index=Math.floor(m.index/8)*8;m.page='join-group';});
        if(m.page==='join-group')return screen('Room code',codeText,[0,4].map(offset=>b(alphabet.slice(m.index+offset,m.index+offset+4).split('').join(' · '),()=>{m.index+=offset;m.page='join-letters';})),nav('join'));
        if(m.page==='join')return screen('Join room',codeText,m.answer.length===6?[
            b('Join room',()=>void enterCoop(nickname,m.answer)),b('Delete last character',()=>{m.answer=m.answer.slice(0,-1);}),b('Clear code',()=>{m.answer='';}),
        ]:[0,8,16,24].map(index=>b(`${alphabet[index]} – ${alphabet[index+7]}`,()=>{m.index=index;m.page='join-group';})),nav('home'));
        return screen('Play with friends', c.error ?? 'Private co-op · up to four players', [
            b('Create room', () => void enterCoop(nickname)), b('Enter room code', () => { m.answer = ''; m.page = 'join'; m.index = 0; }), b('Play solo', () => s.open('start')),
        ]);
    }
    if (!r)
        return screen('Connecting', c.error ?? 'Rejoining your team…', [b('Leave room', leaveCoop)]);
    if (m.page === 'spectate')
        return screen('Watch teammate', 'The screen follows your teammate; your viewpoint stays still.', r.members.filter(p => p.alive).map(p => b(p.name, () => { useCoop.setState({ spectating: p.id }); s.open(null); })), nav('home'));
    if (m.page === 'signals')
        return screen('Quick signals', 'Send a message to your team', [
            ...SIGNALS.slice(m.index, m.index + 3).map(text => b(text, () => sendAction({ type: 'signal', text }))), b('More signals', () => { m.index = m.index === 0 ? 3 : 0; }),
        ], nav('home'));
    if (m.page === 'voice')
        return screen('Voice', c.voiceStatus + ' · Direct connections may be unavailable on some networks.', [
            b(c.voiceEnabled ? 'Turn voice off' : 'Enable voice', () => useCoop.setState({ voiceEnabled: !c.voiceEnabled })), b(c.muted ? 'Unmute' : 'Mute microphone', () => useCoop.setState({ muted: !c.muted }), !c.voiceEnabled), b('Quick signals', nav('signals')), b('Leave room', leaveCoop),
        ], nav('home'));
    if (m.page === 'setup')
        return screen('Night setup', `${r.settings.mode} · Night ${r.settings.night}`, [
            b(`Difficulty: ${r.settings.difficulty}`, () => { const ds = ['easy', 'medium', 'hard'] as const; sendAction({ type: 'configure', ...r.settings, difficulty: ds[(ds.indexOf(r.settings.difficulty) + 1) % 3] }); }, !host),
            b(`Mode: ${r.settings.mode}`, () => sendAction({ type: 'configure', ...r.settings, mode: r.settings.mode === 'normal' ? 'infinite' : 'normal', night: 1 }), !host),
            b(`Night ${r.settings.night}`, () => sendAction({ type: 'configure', ...r.settings, night: r.settings.night % Math.min(3, ...r.members.map(p => p.unlocked)) + 1 }), !host || r.settings.mode === 'infinite'),
            b('Leave room', leaveCoop),
        ], nav('home'));
    const roster = r.members.map(p => `${p.name}: ${!p.connected ? 'reconnecting' : r.phase === 'playing' ? p.alive ? 'playing' : 'spectating' : p.ready ? 'ready' : 'not ready'}`).join(' · ');
    return screen(`Room ${r.code}`, `${c.connected ? roster : 'Reconnecting…'}${r.paused ? ' · Team paused' : ''}`, r.phase === 'playing' ? [
        b('Return to game', () => s.open(null)), b(host ? (r.paused ? 'Resume team' : 'Pause team') : 'Quick signals', host ? () => sendAction({ type: 'pause', paused: !r.paused }) : nav('signals')), b('Voice and signals', nav('voice')), b(self?.alive ? 'Leave room' : 'Watch teammate', self?.alive ? leaveCoop : nav('spectate')),
    ] : [b(self?.ready ? 'Not ready' : 'Ready', () => sendAction({ type: 'ready', ready: !self?.ready }), !c.connected), b(host ? 'Start night' : 'Waiting for host', () => sendAction({ type: 'start' }), !host || r.members.some(p => !p.ready || !p.connected)), b('Night setup', nav('setup')), b('Voice and signals', nav('voice'))]);
}
