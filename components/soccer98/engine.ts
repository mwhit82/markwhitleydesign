export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export const COLS = 24, ROWS = 18;
export const vectors: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export type Match = { players: Point[]; ball: Point | null; direction: Direction; score: number; status: "ready" | "playing" | "paused" | "over" | "won" };
export const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export function placeBall(players: Point[], previous?: Point | null, random = Math.random): Point | null {
  const occupied = new Set(players.map(p => p.y * COLS + p.x));
  const free: Point[] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const p = { x, y };
    if (!occupied.has(y * COLS + x) && (!previous || !same(previous, p))) free.push(p);
  }
  return free.length ? free[Math.floor(random() * free.length)] : null;
}
export function newMatch(): Match {
  const players = [{ x: 8, y: 9 }];
  return { players, ball: { x: 14, y: 9 }, direction: "right", score: 0, status: "ready" };
}
export function step(match: Match, direction: Direction, ballAvailable = true, random = Math.random): Match {
  if (match.status !== "playing") return match;
  const old = vectors[match.direction], next = vectors[direction];
  if (old.x + next.x === 0 && old.y + next.y === 0) direction = match.direction;
  const v = vectors[direction], head = { x: match.players[0].x + v.x, y: match.players[0].y + v.y };
  const collected = ballAvailable && !!match.ball && same(head, match.ball);
  const body = collected ? match.players : match.players.slice(0, -1);
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || body.some(p => same(p, head))) return { ...match, status: "over" };
  const players = [head, ...body];
  const ball = collected ? placeBall(players, match.ball, random) : match.ball;
  return { players, ball, direction, score: match.score + Number(collected), status: ball ? "playing" : "won" };
}

/** Retain two deliberate corners without accumulating repeated or illegal turns. */
export function enqueueTurn(queue: Direction[], current: Direction, direction: Direction): boolean {
  if (queue.length >= 2) return false;
  const previous = vectors[queue.at(-1) ?? current], next = vectors[direction];
  if ((previous.x === next.x && previous.y === next.y) || (previous.x + next.x === 0 && previous.y + next.y === 0)) return false;
  queue.push(direction);
  return true;
}

/** Stable ball placements allow the server to replay a submitted match. */
export function seededRandom(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
