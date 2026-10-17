import type { Point } from "./engine";
export type BallFlight = { from: Point; to: Point; elapsed: number; duration: number };
export function kickBall(from: Point, to: Point): BallFlight {
  const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  // Short passes land before the runner can reach the next square.
  return { from, to, elapsed: 0, duration: Math.min(650, distance * 110) };
}
export function sampleFlight(flight: BallFlight) {
  const t = Math.min(1, Math.max(0, flight.elapsed / flight.duration));
  const x = flight.from.x + (flight.to.x - flight.from.x) * t;
  const y = flight.from.y + (flight.to.y - flight.from.y) * t;
  const arc = 4 * t * (1 - t);
  const distance = Math.hypot(flight.to.x - flight.from.x, flight.to.y - flight.from.y);
  // Keep the airborne ball inside the canvas even along the top touchline.
  const height = Math.min(18 + distance * 2, 56, 24 + y * 16) * arc;
  return { x, y, height, arc, rotation: t * Math.PI * 2 };
}
