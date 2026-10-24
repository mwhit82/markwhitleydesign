"use client";
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/deader/store';
import { useCoop, enterCoop, leaveCoop, resumeCoop, sendAction } from '@/lib/deader/multiplayer/client';
import { cosmetics } from '@/lib/deader/game';
import { SIGNALS } from '@/lib/deader/multiplayer/types';
import { Modal } from '../modal';
import { ActionIcon } from '../action-icon';
import { CoopVoice, setPeerVolume } from './voice';
import styles from '../game.module.css';
export function CoopUI() {
    const s = useGame(), c = useCoop(), [name, setName] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
    useEffect(() => { resumeCoop(); const invite = new URL(location.href).searchParams.get('room'); if (invite) {
        setCode(invite.toUpperCase());
        useGame.getState().open('coop');
    } }, []);
    useEffect(()=>{if(c.connected)sendAction({type:'appearance',appearance:{colour:cosmetics.find(x=>x.id===s.save.equipped)?.colour??'#ffc928',outfit:s.save.outfit,pet:s.save.equippedPet}});},[c.connected,s.save.equipped,s.save.outfit,s.save.equippedPet]);
    const room = c.room, self = room?.members.find(p => p.id === c.membership?.id), host = room?.host === self?.id;
    const enter = async (join: boolean) => { setBusy(true); await enterCoop(name, join ? code : undefined); setBusy(false); };
    return <><CoopVoice />
 {c.membership && s.panel !== 'coop' && <aside className={styles.coopHud} aria-label="Team session">
  <button onClick={() => s.open('coop')}>{room?.paused ? 'Team paused' : c.connected ? `${room?.members.length ?? 1}/4 players` : 'Reconnecting…'}</button>
  {self && !self.alive && room?.phase === 'playing' && <span>Spectating until next night</span>}
  {room?.signals.slice(-1).map(signal => <span key={signal.id} role="status">{room.members.find(p => p.id === signal.member)?.name}: {signal.text}</span>)}
 </aside>}
 {s.panel === 'coop' && <Modal label="Play with friends" className={styles.coopModal}>
  <h2>{room ? `Room ${room.code}` : 'Play with friends'}</h2>
  {c.error && <p role="alert">{c.error}</p>}
  {!c.membership ? <>
   <p>Up to four players · private co-op</p>
   <label>Your name<input aria-label="Your name" maxLength={20} value={name} onChange={e => setName(e.target.value)}/></label>
   <div className={styles.resumeActions}><button className={styles.primary} disabled={busy || name.trim().length < 2} onClick={() => void enter(false)}>Create room</button></div>
   <label>Room code<input aria-label="Room code" maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase())}/></label>
   <div className={styles.resumeActions}><button disabled={busy || name.trim().length < 2 || code.length !== 6} onClick={() => void enter(true)}>Join room</button><button onClick={() => s.open('start')}>Play solo</button></div>
  </> : !room ? <p role="status">Reconnecting to your room…</p> : <>
   <div className={styles.resumeActions}><button onClick={() => { const url = new URL(location.href); url.search = ''; url.searchParams.set('room', room.code); void navigator.clipboard.writeText(url.href).then(() => setCopied(true)).catch(() => useCoop.setState({ error: `Share room code ${room.code}` })); }}>{copied ? 'Invite copied' : 'Copy invite link'}</button><span>{c.connected ? 'Connected' : 'Reconnecting…'}</span></div>
   <ul className={styles.coopRoster}>{room.members.map(p => <li key={p.id}><span style={{ color: p.appearance.colour }}>●</span><strong>{p.name}{p.id === room.host ? ' · Host' : ''}</strong><span>{!p.connected ? 'Reconnecting' : room.phase === 'playing' ? p.alive ? 'Playing' : 'Spectating' : p.ready ? 'Ready' : 'Not ready'}</span>{c.speaking.includes(p.id) && <span>Speaking</span>}</li>)}</ul>
   {room.phase !== 'playing' ? <>
    <fieldset className={`${styles.settings} ${styles.coopSetup}`}><legend>Night setup</legend>
     <label>Difficulty<select aria-label="Co-op difficulty" disabled={!host} value={room.settings.difficulty} onChange={e => sendAction({ type: 'configure', ...room.settings, difficulty: e.target.value as typeof room.settings.difficulty })}>{['easy', 'medium', 'hard'].map(v => <option key={v}>{v}</option>)}</select></label>
     <label>Mode<select aria-label="Co-op mode" disabled={!host} value={room.settings.mode} onChange={e => sendAction({ type: 'configure', ...room.settings, mode: e.target.value as typeof room.settings.mode })}><option value="normal">Story</option><option value="infinite">Infinite</option></select></label>
     {room.settings.mode === 'normal' && <label>Night<select aria-label="Co-op night" disabled={!host} value={room.settings.night} onChange={e => sendAction({ type: 'configure', ...room.settings, night: Number(e.target.value) })}>{[1, 2, 3].filter(n => n <= Math.min(...room.members.map(p => p.unlocked))).map(n => <option key={n} value={n}>Night {n}</option>)}</select></label>}
    </fieldset>
    {room.phase === 'results' && <p>{room.world.night?.status === 'completed' ? 'Night survived.' : 'The night is over.'} Ready up to play again.</p>}
    <div className={styles.resumeActions}><button disabled={!c.connected} onClick={() => sendAction({ type: 'ready', ready: !self?.ready })}>{self?.ready ? 'Not ready' : 'Ready'}</button>{host && <button className={styles.primary} disabled={!c.connected || room.members.some(p => !p.connected || !p.ready)} onClick={() => sendAction({ type: 'start' })}>Start night</button>}</div>
   </> : <div className={styles.resumeActions}><button className={styles.primary} onClick={() => s.open(null)}><ActionIcon name="play"/>Return to game</button>{host && <button onClick={() => sendAction({ type: 'pause', paused: !room.paused })}>{room.paused ? 'Resume team' : 'Pause team'}</button>}</div>}
   {self && !self.alive && room.phase === 'playing' && <label>Watch teammate<select aria-label="Spectate teammate" value={c.spectating ?? ''} onChange={e => useCoop.setState({ spectating: e.target.value || null })}><option value="">Automatic</option>{room.members.filter(p => p.alive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
   <details className={styles.coopVoice}><summary>Voice · {c.voiceEnabled ? c.muted ? 'Muted' : 'On' : 'Off'}</summary><fieldset className={styles.settings}><legend>Voice controls</legend><p>{c.voiceStatus}. Direct voice may be unavailable on some networks.</p><div className={styles.resumeActions}><button onClick={() => useCoop.setState({ voiceEnabled: !c.voiceEnabled, voiceStatus: c.voiceEnabled ? 'Voice off' : 'Connecting microphone…' })}>{c.voiceEnabled ? 'Turn voice off' : 'Enable voice'}</button>{c.voiceEnabled && <><button onClick={() => useCoop.setState({ muted: !c.muted })}>{c.muted ? 'Unmute microphone' : 'Mute microphone'}</button><button onClick={() => { useCoop.setState({ voiceEnabled: false }); const id=c.membership?.id;setTimeout(() => {if(useCoop.getState().membership?.id===id)useCoop.setState({ voiceEnabled: true });}, 100); }}>Retry voice</button></>}</div>
    {room.members.filter(p => p.id !== self?.id).map(p => <label key={p.id}>{p.name} · {c.voicePeers[p.id] ?? 'Voice off'}<input aria-label={`${p.name} voice volume`} type="range" min={0} max={1} step={.1} defaultValue={1} onChange={e => setPeerVolume(p.id, Number(e.target.value))}/></label>)}
   </fieldset></details>
   <fieldset className={styles.settings}><legend>Quick signals</legend><div className={styles.coopSignals}>{SIGNALS.map(text => <button key={text} disabled={!c.connected} onClick={() => sendAction({ type: 'signal', text })}>{text}</button>)}</div></fieldset>
   <button onClick={leaveCoop}><ActionIcon name="close"/>Leave room</button>
  </>}
 </Modal>}
 </>;
}
