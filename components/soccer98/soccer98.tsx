"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { COLS, ROWS, newMatch, step, vectors, type Direction, type Match } from "./engine";
import styles from "./soccer98.module.css";

const CELL = 16, PAD = 24, WIDTH = COLS * CELL + PAD * 2, HEIGHT = ROWS * CELL + PAD * 2;
const keys: Record<string, Direction> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };

function draw(canvas: HTMLCanvasElement, match: Match) {
  const c = canvas.getContext("2d");
  if (!c) return;
  c.imageSmoothingEnabled = false;
  c.fillStyle = "#194a38"; c.fillRect(0, 0, WIDTH, HEIGHT);
  for (let x = 0; x < COLS; x++) { c.fillStyle = Math.floor(x / 3) % 2 ? "#348956" : "#3b925c"; c.fillRect(PAD + x * CELL, PAD, CELL, ROWS * CELL); }
  c.strokeStyle = "#c8dbad"; c.lineWidth = 1;
  c.strokeRect(PAD + .5, PAD + .5, COLS * CELL - 1, ROWS * CELL - 1);
  c.beginPath(); c.moveTo(WIDTH / 2, PAD); c.lineTo(WIDTH / 2, HEIGHT - PAD); c.stroke();
  c.beginPath(); c.arc(WIDTH / 2, HEIGHT / 2, 40, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#c8dbad"; c.fillRect(WIDTH / 2 - 1, HEIGHT / 2 - 1, 3, 3);
  for (const right of [false, true]) {
    c.strokeRect(right ? WIDTH - PAD - 56 : PAD, HEIGHT / 2 - 72, 56, 144);
    c.strokeRect(right ? WIDTH - PAD - 24 : PAD, HEIGHT / 2 - 36, 24, 72);
    c.fillStyle = "#adc4ac"; c.fillRect(right ? WIDTH - PAD + 2 : PAD - 12, HEIGHT / 2 - 25, 10, 50);
    c.fillStyle = "#416354";
    for (let i = 0; i < 10; i++) c.fillRect(right ? WIDTH - PAD + 2 : PAD - 12, HEIGHT / 2 - 24 + i * 5, 9, 1);
  }
  if (match.ball) {
    const x = PAD + match.ball.x * CELL + 8, y = PAD + match.ball.y * CELL + 8;
    c.fillStyle = "#244c35"; c.fillRect(x - 4, y + 4, 11, 3);
    c.fillStyle = "#fff8dc"; c.fillRect(x - 4, y - 5, 8, 10); c.fillRect(x - 5, y - 3, 10, 6);
    c.fillStyle = "#263b34"; c.fillRect(x - 1, y - 2, 3, 3); c.fillRect(x - 4, y + 2, 2, 2); c.fillRect(x + 2, y - 4, 2, 2);
  }
  [...match.players].reverse().forEach((p, reverseIndex) => {
    const leader = reverseIndex === match.players.length - 1;
    const x = PAD + p.x * CELL + 8, y = PAD + p.y * CELL + 8;
    const stride = (p.x + p.y) % 2 ? 1 : -1;
    c.fillStyle = "#24563d"; c.fillRect(x - 5, y + 5, 12, 3);
    c.fillStyle = "#172d30"; c.fillRect(x - 4, y + 4 + stride, 3, 3); c.fillRect(x + 2, y + 4 - stride, 3, 3);
    c.fillStyle = leader ? "#faf3cd" : "#263451"; c.fillRect(x - 4, y + 2, 8, 3);
    c.fillStyle = "#e4aa79"; c.fillRect(x - 6, y - 3, 2, 5); c.fillRect(x + 4, y - 3, 2, 5);
    c.fillStyle = leader ? "#f4d655" : "#e77565"; c.fillRect(x - 4, y - 4, 8, 6);
    c.fillStyle = "#edbd8d"; c.fillRect(x - 3, y - 8, 6, 5);
    c.fillStyle = "#342e2c"; c.fillRect(x - 3, y - 9, 6, 2);
    if (leader) { c.fillStyle = "#fff5b9"; c.fillRect(x - 1, y - 14, 3, 2); c.fillRect(x, y - 12, 1, 2); }
  });
}

export function Soccer98() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Match>(newMatch());
  const queue = useRef<Direction[]>([]);
  const [match, setMatch] = useState<Match>(game.current);
  const [best, setBest] = useState(0);
  const publish = useCallback((next: Match) => { game.current = next; setMatch(next); }, []);
  const turn = useCallback((direction: Direction) => {
    if (game.current.status !== "playing" || queue.current.length >= 2) return;
    const previous = vectors[queue.current.at(-1) ?? game.current.direction], next = vectors[direction];
    if ((previous.x === next.x && previous.y === next.y) || (previous.x + next.x === 0 && previous.y + next.y === 0)) return;
    queue.current.push(direction);
  }, []);
  const start = useCallback(() => { queue.current = []; publish({ ...newMatch(), status: "playing" }); }, [publish]);
  const pause = useCallback(() => { const current = game.current; if (current.status === "playing" || current.status === "paused") { queue.current = []; publish({ ...current, status: current.status === "playing" ? "paused" : "playing" }); } }, [publish]);
  useEffect(() => { try { const saved = Number(localStorage.getItem("soccer98-best")); if (Number.isFinite(saved) && saved > 0) setBest(saved); } catch {} }, []);
  useEffect(() => { if (canvas.current) draw(canvas.current, match); }, [match]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (game.current.status !== "playing") return;
      const next = step(game.current, queue.current.shift() ?? game.current.direction);
      publish(next);
      setBest(previous => { const record = Math.max(previous, next.score); try { localStorage.setItem("soccer98-best", String(record)); } catch {} return record; });
    }, 150);
    const keydown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))) return;
      const direction = keys[e.key] ?? keys[e.key.toLowerCase()];
      if (direction) { e.preventDefault(); turn(direction); }
      if ((e.code === "Space" || e.key.toLowerCase() === "p") && !(e.code === "Space" && e.target instanceof HTMLElement && ["BUTTON", "A"].includes(e.target.tagName))) { e.preventDefault(); if (!e.repeat) { if (["ready", "over", "won"].includes(game.current.status)) start(); else pause(); } }
    };
    const hide = () => { if (game.current.status === "playing") publish({ ...game.current, status: "paused" }); };
    const visibility = () => { if (document.hidden) hide(); };
    window.addEventListener("keydown", keydown); window.addEventListener("blur", hide); document.addEventListener("visibilitychange", visibility);
    return () => { clearInterval(timer); window.removeEventListener("keydown", keydown); window.removeEventListener("blur", hide); document.removeEventListener("visibilitychange", visibility); };
  }, [pause, publish, start, turn]);
  const active = match.status === "playing";
  return <div className={styles.page}>
    <nav className={styles.nav}><Link href="/">← Back to AI experiments</Link><span>EXPERIMENT 02 / 1998 ENERGY</span></nav>
    <header className={styles.header}><p>THE BEAUTIFUL GAME. ONE VERY LONG CHASE.</p><h1>SOCCER<span>98</span><sup>™</sup></h1><p>Collect the ball. Lose the defenders. Keep running.</p></header>
    <div className={styles.cabinet}>
      <div className={styles.scoreboard}><div><small>BALLS</small><strong>{String(match.score).padStart(2, "0")}</strong></div><div className={styles.live}><span className={styles.dot}/> {active ? "IN PLAY" : match.status === "paused" ? "PAUSED" : "SOCCER98"}</div><div><small>PERSONAL BEST</small><strong>{String(best).padStart(2, "0")}</strong></div></div>
      <div className={styles.pitch}><canvas ref={canvas} width={WIDTH} height={HEIGHT} role="img" aria-label={`Football pitch. You wear yellow. ${match.score} defenders are chasing you.`}/>
        {!active && <div className={styles.overlay}><div><span>★ SOCCER98 ★</span><h2>{match.status === "ready" ? "Ready for kick-off?" : match.status === "paused" ? "Half-time." : match.status === "won" ? "Pitch perfect!" : "Full-time."}</h2><p>{match.status === "ready" ? "Every ball adds a defender to your trail. Stay clear of them and the touchlines." : match.status === "paused" ? "Take a breather. The chase can wait." : `${match.score} balls collected. ${match.score} defenders on your heels.`}</p><button onClick={match.status === "paused" ? pause : start}>{match.status === "ready" ? "KICK OFF →" : match.status === "paused" ? "RESUME →" : "PLAY AGAIN →"}</button></div></div>}
      </div>
      <div className={styles.bottom}><span><i/> YOU <i/> DEFENDERS</span><button onClick={pause} disabled={!["playing", "paused"].includes(match.status)}>{match.status === "paused" ? "Resume" : "Pause"} <kbd>P</kbd></button></div>
    </div>
    <div className={styles.controls}><p>Arrow keys / WASD to move<br/><span>Space to pause · No U-turns</span></p><div className={styles.pad} aria-label="Direction controls">{([['up','↑'],['left','←'],['down','↓'],['right','→']] as const).map(([direction, label]) => <button key={direction} className={styles[direction]} aria-label={`Move ${direction}`} onClick={() => turn(direction)} disabled={!active}>{label}</button>)}</div><p>A little football. A little Snake.<br/><span>A simple playable idea.</span></p></div>
    <p className={styles.sr} aria-live="polite">{match.status === "over" || match.status === "won" ? `Match ended. ${match.score} balls collected.` : match.status === "paused" ? "Game paused." : ""}</p>
  </div>;
}
