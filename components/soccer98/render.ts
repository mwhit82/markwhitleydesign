import { COLS, ROWS, type Match } from "./engine";
export const CELL = 16, PAD = 24, WIDTH = COLS * CELL + PAD * 2, HEIGHT = ROWS * CELL + PAD * 2;
export function createRenderer(canvas: HTMLCanvasElement) {
  const pitch = document.createElement("canvas");
  pitch.width = WIDTH; pitch.height = HEIGHT;
  const c = pitch.getContext("2d");
  if (!c) return () => {};
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
  const sprites = new Map<string, HTMLCanvasElement>();
  function sprite(identity: number, stride: number) {
    const key = `${identity === 0 ? "leader" : (identity - 1) % 25}:${stride}`;
    const cached = sprites.get(key);
    if (cached) return cached;
    const tile = document.createElement("canvas"); tile.width = 24; tile.height = 28;
    const c = tile.getContext("2d")!;
    const leader = identity === 0;
    const skins = ["#edbd8d", "#945c3c", "#c98c60", "#633d2b", "#e1a47c"];
    const hairs = ["#39271e", "#161719", "#a56b34", "#5d3927", "#d4b36c"];
    const skin = leader ? "#edbd8d" : skins[(identity - 1) % skins.length];
    const hair = leader ? "#68412c" : hairs[(identity - 1 + Math.floor((identity - 1) / skins.length)) % hairs.length];
    const x = 8, y = 16;
    c.fillStyle = "#24563d"; c.fillRect(x - 5, y + 5, 12, 3);
    c.fillStyle = leader ? "#141719" : "#de3939"; c.fillRect(x - 4, y + 4 + stride, 3, 3); c.fillRect(x + 2, y + 4 - stride, 3, 3);
    c.fillStyle = leader ? "#141719" : "#de3939"; c.fillRect(x - 4, y + 2, 8, 3);
    c.fillStyle = skin; c.fillRect(x - 6, y - 3, 2, 5); c.fillRect(x + 4, y - 3, 2, 5);
    c.fillStyle = leader ? "#f8f6ed" : "#ee4646"; c.fillRect(x - 4, y - 4, 8, 6);
    if (leader) { c.fillStyle = "#141719"; c.fillRect(x - 3, y - 4, 2, 6); c.fillRect(x + 1, y - 4, 2, 6); }
    c.fillStyle = skin; c.fillRect(x - 3, y - 8, 6, 5);
    c.fillStyle = hair; c.fillRect(x - 3, y - 9, 6, 2);
    if (leader) { c.fillStyle = "#fff5b9"; c.fillRect(x - 1, y - 14, 3, 2); c.fillRect(x, y - 12, 1, 2); }
    sprites.set(key, tile);
    return tile;
  }
  // Warm every kit/stride once, before kick-off.
  for (let identity = 0; identity <= 25; identity++) for (const stride of [-1, 1]) sprite(identity, stride);
  // Cache the curved black triads of a classic Tango-style ball once.
  const ball = document.createElement("canvas"); ball.width = 64; ball.height = 64;
  const ink = ball.getContext("2d")!;
  ink.fillStyle = "#bfc5b8"; ink.beginPath(); ink.arc(32, 32, 30, 0, Math.PI * 2); ink.fill();
  ink.fillStyle = "#fffdf1"; ink.beginPath(); ink.arc(30, 29, 28, 0, Math.PI * 2); ink.fill();
  ink.save(); ink.beginPath(); ink.arc(32, 32, 29, 0, Math.PI * 2); ink.clip();
  ink.fillStyle = "#171d1c";
  const triad = new Path2D("M 0 -17 C 3 -7 6 -4 15 8 C 5 5 -5 5 -15 8 C -6 -4 -3 -7 0 -17 Z");
  for (const [x, y, angle] of [[32, 14, 0], [16, 42, -2.1], [48, 42, 2.1]]) {
    ink.save(); ink.translate(x, y); ink.rotate(angle); ink.fill(triad); ink.restore();
  }
  // Fine grey seams leave a white centre, rather than a black pentagon.
  ink.strokeStyle = "#a7ada2"; ink.lineWidth = .8;
  ink.beginPath(); ink.moveTo(24, 24); ink.lineTo(40, 24); ink.lineTo(46, 37); ink.lineTo(32, 46); ink.lineTo(18, 37); ink.closePath(); ink.stroke();
  ink.restore();
  const target = canvas.getContext("2d");
  return (match: Match) => {
    if (!target) return;
    const c = target;
    c.imageSmoothingEnabled = false;
    c.drawImage(pitch, 0, 0);
  if (match.ball) {
    const x = PAD + match.ball.x * CELL + 8, y = PAD + match.ball.y * CELL + 8;
    c.fillStyle = "#244c35"; c.fillRect(x - 6, y + 5, 14, 3);
    c.drawImage(ball, x - 7, y - 7, 14, 14);
  }
    for (let identity = match.players.length - 1; identity >= 0; identity--) {
      const p = match.players[identity];
      c.drawImage(sprite(identity, (p.x + p.y) % 2 ? 1 : -1), PAD + p.x * CELL, PAD + p.y * CELL - 8);
    }
  };
}
