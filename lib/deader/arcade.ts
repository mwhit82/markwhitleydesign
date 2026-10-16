/** Original deterministic one-button runner. Units are independent of screen size. */
export type ArcadeState = {
    x: number;
    y: number;
    vy: number;
    attempt: number;
    status: 'ready' | 'running' | 'crashed' | 'won';
    grounded: boolean;
};
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
            if (r.x + .65 <= o.x || r.x >= o.x + o.w)
                continue;
            if (o.kind === 'block' && oldY >= o.h - .025 && r.y <= o.h && r.vy <= 0) {
                r.y = o.h;
                r.vy = 0;
                r.grounded = true;
            }
            else if (r.y < o.h - .08 && r.y + .65 > o.y + .08) {
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
