import { newMatch, step, seededRandom, type Direction } from '../../components/soccer98/engine';
const directions: Direction[] = ['up', 'down', 'left', 'right'];
export function validateReplay(seed: number, trace: unknown, elapsed: number) {
  if (typeof trace !== 'string' || !/^[0-7]{1,24000}$/.test(trace) || elapsed + 1000 < trace.length * 150) return null;
  const random = seededRandom(seed);
  let match = { ...newMatch(), status: 'playing' } as ReturnType<typeof newMatch>;
  for (const code of trace) {
    if (match.status !== 'playing') return null;
    const n = Number(code);
    match = step(match, directions[n % 4], n < 4, random);
  }
  return (match.status === 'over' || match.status === 'won') && match.score > 0 ? match.score : null;
}
export function validName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 20 && /^[\p{L}\p{N} ._'’-]+$/u.test(value.trim());
}
