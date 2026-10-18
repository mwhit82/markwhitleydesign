"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { newMatch, step, enqueueTurn, seededRandom, type Direction, type Match } from "./engine";
import styles from "./soccer98.module.css";

import { createRenderer, WIDTH, HEIGHT } from "./render";
import { kickBall, type BallFlight } from "./ball-flight";
import { SoccerAudio } from "./audio";
import { Leaderboard, type RankedResult } from "./leaderboard";
const keys: Record<string, Direction> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };


export function Soccer98() {
  const [boardOpen, setBoardOpen] = useState(false);
  const boardVisible = useRef(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [rankedHint, setRankedHint] = useState("");
  const [result, setResult] = useState<RankedResult | null>(null);
  const run = useRef<string | null>(null);
  const trace = useRef("");
  const random = useRef(Math.random);
  const surface = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [screenHint, setScreenHint] = useState("");
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (surface.current?.requestFullscreen) await surface.current.requestFullscreen();
      else setScreenHint("For edge-to-edge play on iPad, use Safari’s Share → Add to Home Screen, then open Soccer98 there.");
    } catch { setScreenHint("For edge-to-edge play on iPad, use Safari’s Share → Add to Home Screen, then open Soccer98 there."); }
  };
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const sound = useRef<SoccerAudio | null>(null);
  const [muted, setMuted] = useState(false);
  const flight = useRef<BallFlight | null>(null);
  const animationAt = useRef<number | null>(null);
  const draw = useRef<((match: Match, flight?: BallFlight | null) => void) | null>(null);
  const tickAt = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Match>(newMatch());
  const queue = useRef<Direction[]>([]);
  const [match, setMatch] = useState<Match>(game.current);
  const [best, setBest] = useState(0);
  const publish = useCallback((next: Match) => {
    const previous = game.current;
    game.current = next;
    draw.current?.(next, flight.current);
    if (previous.score !== next.score || previous.status !== next.status) setMatch(next);
  }, []);
  const turn = useCallback((direction: Direction) => {
    if (game.current.status === "playing") enqueueTurn(queue.current, game.current.direction, direction);
  }, []);
  const clearInput = useCallback(() => { queue.current = []; swipe.current = null; tickAt.current = null; animationAt.current = null; }, []);
  const start = useCallback(async () => {
    if (startingRef.current || boardVisible.current) return;
    startingRef.current = true; setStarting(true); setRankedHint(""); setResult(null);
    sound.current?.stop(); sound.current?.unlock();
    run.current = null; trace.current = ""; random.current = Math.random;
    try {
      const response = await fetch('/api/soccer98/start', {method:'POST', signal:AbortSignal.timeout(5000)});
      const data = await response.json();
      if (!response.ok) throw new Error();
      run.current = data.run; random.current = seededRandom(data.seed);
    } catch { setRankedHint('Practice match — leaderboard connection unavailable.'); }
    flight.current = null; clearInput();
    publish({ ...newMatch(), status: document.hidden || boardVisible.current ? "paused" : "playing" });
    startingRef.current = false; setStarting(false);
  }, [clearInput, publish]);
  const pause = useCallback(() => {
    const current = game.current;
    if (current.status !== "playing" && current.status !== "paused") return;
    clearInput(); sound.current?.stop();
    if (current.status === "paused") sound.current?.unlock();
    publish({ ...current, status: current.status === "playing" ? "paused" : "playing" });
  }, [clearInput, publish]);
  const toggleMute = () => {
    const next = !muted;
    setMuted(next); sound.current?.setMuted(next);
    if (!next) sound.current?.unlock();
    try { localStorage.setItem("soccer98-muted", String(next)); } catch {}
  };
  useEffect(() => {
    const audio = new SoccerAudio(); sound.current = audio;
    let savedBest = 0;
    try {
      const value = Number(localStorage.getItem("soccer98-best"));
      if (Number.isFinite(value) && value > 0) savedBest = value;
      const silent = localStorage.getItem("soccer98-muted") === "true";
      audio.setMuted(silent); setMuted(silent);
    } catch {}
    setBest(savedBest);
    if (canvas.current) { draw.current = createRenderer(canvas.current); draw.current(game.current); }
    return () => { audio.dispose(); sound.current = null; draw.current = null; };
  }, []);
  useEffect(() => {
    if (match.score <= best) return;
    setBest(match.score);
    try { localStorage.setItem("soccer98-best", String(match.score)); } catch {}
  }, [match.score, best]);
  useEffect(() => {
    let frame = 0;
    const animate = (now: number) => {
      if (game.current.status === "playing") {
        const delta = animationAt.current === null ? 0 : now - animationAt.current;
        animationAt.current = now;
        if (flight.current) {
          flight.current.elapsed += delta;
          if (flight.current.elapsed >= flight.current.duration) flight.current = null;
          draw.current?.(game.current, flight.current);
        }
        if (tickAt.current === null) tickAt.current = now;
        const elapsed = now - tickAt.current;
        if (elapsed >= 150) {
          // Preserve cadence under ordinary jitter; never replay a backlog after a stall.
          tickAt.current = elapsed >= 300 ? now : tickAt.current + 150;
          const previous = game.current;
          const direction = queue.current.shift() ?? previous.direction;
          if (run.current) {
            if (trace.current.length >= 24000) { run.current = null; setRankedHint('Long match — this run is practice only.'); }
            else trace.current += String(['up','down','left','right'].indexOf(direction) + (flight.current ? 4 : 0));
          }
          const next = step(previous, direction, !flight.current, random.current);
          if ((next.status === 'over' || next.status === 'won') && next.score > 0 && run.current) setResult({run:run.current,trace:trace.current,score:next.score});
          if (next.score > previous.score && previous.ball && next.ball) flight.current = kickBall(previous.ball, next.ball);
          publish(next);
          if (next.status !== "over" && next.direction !== previous.direction) sound.current?.play("turn");
          if (next.score > previous.score) { sound.current?.play("turn"); sound.current?.play("cheer"); }
          if (next.status === "over") sound.current?.stop();
        }
      } else { tickAt.current = null; animationAt.current = null; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const keydown = (e: KeyboardEvent) => {
      if (boardVisible.current || startingRef.current) return;
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))) return;
      const direction = keys[e.key] ?? keys[e.key.toLowerCase()];
      if (direction) { e.preventDefault(); if (!e.repeat) turn(direction); }
      if ((e.code === "Space" || e.key.toLowerCase() === "p") && !(e.code === "Space" && e.target instanceof HTMLElement && ["BUTTON", "A"].includes(e.target.tagName))) { e.preventDefault(); if (!e.repeat) { if (["ready", "over", "won"].includes(game.current.status)) start(); else pause(); } }
    };
    const hide = () => { clearInput(); sound.current?.stop(); if (game.current.status === "playing") publish({ ...game.current, status: "paused" }); };
    const visibility = () => { if (document.hidden) hide(); };
    window.addEventListener("keydown", keydown); window.addEventListener("blur", hide); document.addEventListener("visibilitychange", visibility);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", keydown); window.removeEventListener("blur", hide); document.removeEventListener("visibilitychange", visibility); };
  }, [clearInput, pause, publish, start, turn]);
  const openBoard = () => {
    boardVisible.current = true; setBoardOpen(true);
    if (game.current.status === 'playing') pause();
  };
  const active = match.status === "playing";
  return <div ref={surface} className={styles.page}>
    <nav className={styles.nav}><Link href="/">← Exit</Link><h1>SOCCER<span>98</span></h1><button onClick={toggleFullscreen}>{fullscreen ? "Exit full screen" : "Full screen ⛶"}</button></nav>
    {screenHint && <div className={styles.screenHint} role="status">{screenHint}<button aria-label="Dismiss full screen help" onClick={() => setScreenHint("")}>×</button></div>}
    <div className={styles.stage}>
    <div className={styles.cabinet}>
      <div className={styles.scoreboard}><div><small>BALLS</small><strong>{String(match.score).padStart(2, "0")}</strong></div><div className={styles.live}><span className={styles.dot}/> {active ? "IN PLAY" : match.status === "paused" ? "PAUSED" : "SOCCER98"}</div><div><small>PERSONAL BEST</small><strong>{String(best).padStart(2, "0")}</strong></div></div>
      <div className={styles.pitch}
        onPointerDown={e => { if (!active || (e.target instanceof Element && e.target.closest("button"))) return; swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { const origin = swipe.current; if (!origin || origin.id !== e.pointerId) return; const dx = e.clientX - origin.x, dy = e.clientY - origin.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; turn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up"); swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; }}
        onPointerUp={() => { swipe.current = null; }} onPointerCancel={() => { swipe.current = null; }} onLostPointerCapture={() => { swipe.current = null; }}
      ><canvas ref={canvas} width={WIDTH} height={HEIGHT} role="img" aria-label={`Football pitch. You wear black and white stripes. ${match.score} defenders are chasing you.`}/>
        {!active && <div className={styles.overlay}><div><span>★ SOCCER98 ★</span><h2>{match.status === "ready" ? "Ready for kick-off?" : match.status === "paused" ? "Half-time." : match.status === "won" ? "Pitch perfect!" : "Full-time."}</h2><p>{match.status === "ready" ? "Swipe anywhere on the pitch or tap the arrows. Every ball adds a defender. Avoid them and the touchlines." : match.status === "paused" ? "Take a breather. The chase can wait." : `${match.score} ${match.score === 1 ? "ball" : "balls"} collected. ${match.score} ${match.score === 1 ? "defender" : "defenders"} on your heels.`}</p><button disabled={starting} onClick={match.status === "paused" ? pause : start}>{starting ? "KICKING OFF…" : match.status === "ready" ? "KICK OFF →" : match.status === "paused" ? "RESUME →" : "PLAY AGAIN →"}</button></div></div>}
      </div>
      <div className={styles.bottom}><button aria-label={muted ? "Unmute sound" : "Mute sound"} aria-pressed={muted} onClick={toggleMute}>{muted ? "Sound: muted" : "Sound: on"}</button><button onClick={openBoard}>{result ? "Post score / Table" : "Leaderboard"}</button><button onClick={pause} disabled={!["playing", "paused"].includes(match.status)}>{match.status === "paused" ? "Resume" : "Pause"} <kbd>P</kbd></button></div>
    </div>
    <div className={styles.controls}><p>SWIPE THE PITCH<br/><span>or tap to turn</span></p><div className={styles.pad} aria-label="Touch direction controls">{([['up','↑'],['left','←'],['down','↓'],['right','→']] as const).map(([direction, label]) => <button key={direction} className={styles[direction]} aria-label={`Move ${direction}`} onPointerDown={e => { e.preventDefault(); turn(direction); }} onClick={e => { if (e.detail === 0) turn(direction); }} disabled={!active}>{label}</button>)}</div><p className={styles.keyboard}>Arrow keys / WASD<br/><span>Space to pause</span></p></div>
    </div>
    {rankedHint && !active && <p className={styles.rankedHint}>{rankedHint}</p>}
    {boardOpen && <Leaderboard result={result} onSaved={()=>setResult(null)} onClose={()=>{boardVisible.current=false;setBoardOpen(false);}}/>}
    <p className={styles.sr} aria-live="polite">{match.status === "over" || match.status === "won" ? `Match ended. ${match.score} balls collected.` : match.status === "paused" ? "Game paused." : ""}</p>
  </div>;
}
