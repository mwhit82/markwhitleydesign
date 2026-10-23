/** Original deterministic one-button runner. Units are independent of screen size. */
export type ArcadeState = {
    x: number;
    y: number;
    vy: number;
    attempt: number;
    status: 'ready' | 'running' | 'crashed' | 'won';
    grounded: boolean;
};
export const ARCADE_PLAYER_SIZE = .65;
// Slightly inside the visible cube: outlines and grazing edges are forgiving.
export const ARCADE_HIT_INSET = .025;
type Point = { x: number; y: number };
type Obstacle = { x: number; y: number; w: number; h: number };
export const arcadePlayerAngle = (s: Pick<ArcadeState, 'x' | 'grounded'>) => s.grounded ? 0 : -s.x * 2;
export const arcadeSpikeVertices = (o: Obstacle): Point[] => [
    { x: o.x, y: o.y }, { x: o.x + o.w / 2, y: o.y + o.h }, { x: o.x + o.w, y: o.y },
];
export function arcadePlayerVertices(s: Pick<ArcadeState, 'x' | 'y' | 'grounded'>): Point[] {
    const half = ARCADE_PLAYER_SIZE / 2, radius = half - ARCADE_HIT_INSET;
    const angle = arcadePlayerAngle(s), c = Math.cos(angle), sin = Math.sin(angle);
    return [[-radius, -radius], [radius, -radius], [radius, radius], [-radius, radius]].map(([x,y]) => ({
        x: s.x + half + x * c - y * sin, y: s.y + half + x * sin + y * c,
    }));
}
/** Convex polygon SAT: both sloping spike edges and rotated cube edges separate empty space. */
export function arcadeHitsSpike(s: Pick<ArcadeState, 'x' | 'y' | 'grounded'>, o: Obstacle): boolean {
    const half = ARCADE_PLAYER_SIZE / 2, reach = Math.SQRT2 * half;
    if(s.x + half + reach <= o.x || s.x + half - reach >= o.x + o.w ||
       s.y + half + reach <= o.y || s.y + half - reach >= o.y + o.h) return false;
    const cube = arcadePlayerVertices(s), spike = arcadeSpikeVertices(o);
    for(const polygon of [cube, spike]) for(let i=0; i<polygon.length; i++) {
        const a = polygon[i], b = polygon[(i+1)%polygon.length];
        const nx = -(b.y-a.y), ny = b.x-a.x;
        let minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity;
        for(const p of cube){const v=p.x*nx+p.y*ny;minA=Math.min(minA,v);maxA=Math.max(maxA,v);}
        for(const p of spike){const v=p.x*nx+p.y*ny;minB=Math.min(minB,v);maxB=Math.max(maxB,v);}
        if(maxA <= minB + 1e-9 || maxB <= minA + 1e-9)return false;
    }
    return true;
}
export const ARCADE_SPEED = 5;
export const ARCADE_END = 225;
export const arcadeLevel = [
    ...[12, 24, 37, 51, 66, 82, 99, 117, 136, 156, 177, 199, 215].map(x => ({ x, y: 0, w: .8, h: .9, kind: 'spike' as const })),
    ...[31, 59, 90, 126, 166, 188, 207].map(x => ({ x, y: 0, w: 2, h: 1, kind: 'block' as const })),
];
export const freshArcade = (attempt = 1): ArcadeState => ({ x: 0, y: 0, vy: 0, attempt, status: 'ready', grounded: true });
export function stepArcade(s: ArcadeState, delta: number, jump: boolean): ArcadeState {
    if (s.status !== 'running' || !Number.isFinite(delta) || delta <= 0)
        return s;
    const r = { ...s };
    // Bounded substeps avoid tunnelling and tab-switch catch-up.
    let remaining = Math.min(delta, .05);
    while (remaining > 0) {
        const dt = Math.min(remaining, 1 / 120);
        remaining -= dt;
        if (jump && r.grounded) {
            r.vy = 8.5;
            r.grounded = false;
        }
        const oldY = r.y;
        r.x += ARCADE_SPEED * dt;
        r.vy -= 24 * dt;
        r.y += r.vy * dt;
        r.grounded = false;
        if (r.y <= 0) {
            r.y = 0;
            r.vy = 0;
            r.grounded = true;
        }
        for (const o of arcadeLevel) {
            if(o.kind === 'spike') {
                if(arcadeHitsSpike(r,o)){r.status='crashed';return r;}
                continue;
            }
            if (r.x + ARCADE_PLAYER_SIZE <= o.x || r.x >= o.x + o.w)
                continue;
            if (oldY >= o.h - .025 && r.y <= o.h && r.vy <= 0) {
                r.y = o.h;
                r.vy = 0;
                r.grounded = true;
            }
            else if (r.y < o.h - .08 && r.y + ARCADE_PLAYER_SIZE > o.y + .08) {
                r.status = 'crashed';
                return r;
            }
        }
        if (r.x >= ARCADE_END) {
            r.status = 'won';
            return r;
        }
    }
    return r;
}
