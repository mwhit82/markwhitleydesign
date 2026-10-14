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
  const target = canvas.getContext("2d");
  return (match: Match) => {
    if (!target) return;
    const c = target;
    c.imageSmoothingEnabled = false;
    c.drawImage(pitch, 0, 0);
  if (match.ball) {
    const x = PAD + match.ball.x * CELL + 8, y = PAD + match.ball.y * CELL + 8;
    c.fillStyle = "#244c35"; c.fillRect(x - 4, y + 4, 11, 3);
    c.fillStyle = "#fff8dc"; c.fillRect(x - 4, y - 5, 8, 10); c.fillRect(x - 5, y - 3, 10, 6);
    c.fillStyle = "#263b34"; c.fillRect(x - 1, y - 2, 3, 3); c.fillRect(x - 4, y + 2, 2, 2); c.fillRect(x + 2, y - 4, 2, 2);
  }
    for (let identity = match.players.length - 1; identity >= 0; identity--) {
      const p = match.players[identity];
      c.drawImage(sprite(identity, (p.x + p.y) % 2 ? 1 : -1), PAD + p.x * CELL, PAD + p.y * CELL - 8);
    }
  };
}
