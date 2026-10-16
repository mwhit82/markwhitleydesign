"use client";
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/lib/deader/store';
import { arcadeLevel, ARCADE_END, freshArcade, stepArcade } from '@/lib/deader/arcade';
import { roomAudio } from '@/lib/deader/audio/room-audio';
import styles from './game.module.css';
export default function ArcadeUI() {
    const dialog = useRef<HTMLElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const run = useRef(useGame.getState().arcade ?? freshArcade());
    const [status, setStatus] = useState(run.current.status), [countdown, setCountdown] = useState(0), [progress, setProgress] = useState(0);
    const held = useRef(false), count = useRef(0), ready = useRef(false);
    useEffect(() => { dialog.current?.focus(); }, [status]);
    useEffect(() => {
        const runId = useGame.getState().room.encounters.runId;
        let last = performance.now(), raf = 0, ui = 0;
        const clear = () => { held.current = false; };
        const unsubscribe = useGame.subscribe((s, p) => { if (s.panel !== p.panel || s.suspension !== p.suspension || s.focused !== p.focused || s.room.view !== p.room.view) {
            clear();
            ready.current = false;
            count.current = 0;
            setCountdown(0);
        } });
        const key = (e: KeyboardEvent) => { if (e.code !== 'Space' || (e.target instanceof HTMLElement && e.target.closest('button')))
            return; e.preventDefault(); if (!e.repeat && ready.current)
            held.current = true; };
        const up = (e: KeyboardEvent) => { if (e.code === 'Space')
            clear(); };
        window.addEventListener('keydown', key);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', clear);
        window.addEventListener('pointerup', clear);
        window.addEventListener('pointercancel', clear);
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const dt = Math.min((now - last) / 1000, .05);
            last = now;
            const s = useGame.getState();
            const active = s.focused && !s.suspension && !s.panel && s.room.view === 'arcade' && s.room.survival.phase === 'idle' && s.room.night?.status !== 'completed';
            if (active && count.current > 0) {
                count.current = Math.max(0, count.current - dt);
                setCountdown(Math.ceil(count.current));
                if (!count.current) {
                    ready.current = true;
                    run.current = { ...run.current, status: 'running' };
                    setStatus('running');
                }
            }
            if (active && ready.current) {
                const previous = run.current;
                run.current = stepArcade(previous, dt, held.current);
                if (previous.grounded && !run.current.grounded && held.current)
                    roomAudio.play('jump');
                if (previous.status !== run.current.status) {
                    setStatus(run.current.status);
                    ready.current = false;
                    held.current = false;
                }
            }
            ui += dt;
            if (ui > .2) {
                setProgress(Math.floor(run.current.x / ARCADE_END * 100));
                ui = 0;
            }
            const c = canvas.current;
            if (!c)
                return;
            const ctx = c.getContext('2d');
            if (!ctx)
                return;
            // Fit the actual canvas instead of letterboxing a tiny landscape game on phones.
            const w = Math.max(480, Math.min(960, Math.round(c.clientWidth * 1.2)));
            const h = Math.max(180, Math.round(w * c.clientHeight / Math.max(1,c.clientWidth)));
            if (c.width !== w) c.width = w;
            if (c.height !== h) c.height = h;
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, '#080d10');
            gradient.addColorStop(1, '#26302c');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            const scale = 44, ground = h * .72, offset = run.current.x * scale - 135;
            ctx.strokeStyle = '#d1d3cb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, ground);
            ctx.lineTo(w, ground);
            ctx.stroke();
            for (const o of arcadeLevel) {
                const x = o.x * scale - offset;
                if (x < -150 || x > w + 50)
                    continue;
                ctx.fillStyle = '#090b0d';
                ctx.strokeStyle = '#d9dad3';
                ctx.beginPath();
                if (o.kind === 'spike') {
                    ctx.moveTo(x, ground);
                    ctx.lineTo(x + o.w * scale / 2, ground - o.h * scale);
                    ctx.lineTo(x + o.w * scale, ground);
                    ctx.closePath();
                }
                else
                    ctx.rect(x, ground - o.h * scale, o.w * scale, o.h * scale);
                ctx.fill();
                ctx.stroke();
            }
            ctx.save();
            ctx.translate(149, ground - run.current.y * scale - 14);
            if (!run.current.grounded)
                ctx.rotate(run.current.x * 2);
            ctx.fillStyle = '#d7ac42';
            ctx.fillRect(-14, -14, 28, 28);
            ctx.strokeStyle = '#f4d47d';
            ctx.strokeRect(-14, -14, 28, 28);
            ctx.strokeStyle = '#675b3c';
            ctx.beginPath();
            ctx.moveTo(-9, -8);
            ctx.lineTo(4, 5);
            ctx.moveTo(5, -12);
            ctx.lineTo(10, -6);
            ctx.stroke();
            ctx.restore();
            if (s.save.settings.effects) {
                ctx.fillStyle = '#0002';
                for (let y = 0; y < h; y += 4)
                    ctx.fillRect(0, y, w, 1);
            }
            ctx.fillStyle = '#d8d9d3';
            ctx.font = '14px monospace';
            ctx.fillText('AFTER HOURS // ORIGINAL ARCADE', 24, 30);
        };
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); unsubscribe(); window.removeEventListener('keydown', key); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); window.removeEventListener('pointerup', clear); window.removeEventListener('pointercancel', clear); const s = useGame.getState(); if (s.scene === 'room' && s.room.encounters.runId === runId && s.room.night?.status !== 'completed' && s.room.survival.phase !== 'gameover')
            useGame.setState({ arcade: { ...run.current } }); };
    }, []);
    const begin = () => { if (status === 'crashed' || status === 'won')
        run.current = freshArcade(run.current.attempt + 1); held.current = false; dialog.current?.focus(); count.current = 3; setCountdown(3); roomAudio.unlock(); };
    return <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" className={styles.arcade} aria-label="Impossible Shift" onKeyDown={e=>{
        if(e.key!=="Tab")return;
        const buttons=e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first=buttons[0],last=buttons[buttons.length-1];if(!first)return;
        if(document.activeElement===dialog.current){e.preventDefault();(e.shiftKey?last:first).focus();}
        else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }}>
    <header><div><small>CCTV ARCADE</small><h2>Impossible Shift</h2></div><button onClick={() => useGame.getState().roomView('console')}>Back to CCTV</button></header>
    <div className={styles.arcadeStats}><span>Attempt {run.current.attempt}</span><span>{progress}%</span></div>
    <canvas ref={canvas} aria-label="Jump over spikes and onto platforms" onPointerDown={e => { e.preventDefault(); if (ready.current) {
        held.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
    } }} onPointerUp={() => held.current = false} onPointerCancel={() => held.current = false} onLostPointerCapture={() => held.current = false}/>
    <progress max={100} value={progress} aria-label="Level progress"/>
    <div className={styles.arcadeActions}>
      {countdown > 0 ? <strong role="status">Ready in {countdown}…</strong> : !ready.current ? <button onClick={begin}>{status === 'crashed' ? 'Try again' : status === 'won' ? 'Level complete · Play again' : status === 'running' ? 'Resume run' : 'Start run'}</button> : <button onPointerDown={e => { e.preventDefault(); held.current = true; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={() => held.current = false} onPointerCancel={() => held.current = false} onLostPointerCapture={() => held.current = false} onKeyDown={e => { if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        held.current = true;
    } }} onKeyUp={() => held.current = false}>Jump · hold to repeat</button>}
      <p>Tap the game or press Space to jump. A knock saves your place. The night keeps running.</p>
    </div>
  </section>;
}
