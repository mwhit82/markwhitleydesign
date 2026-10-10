export function handling(speed: number, steer: number, grip: number, hand: boolean, offroad: boolean) {
  const corner = Math.min(Math.abs(speed) / 16, 1) * Math.abs(steer);
  return {
    grip: hand ? 1.8 : grip * (1 - corner * 0.28),
    drag: offroad ? 1.9 : hand ? 0.7 : 0.12,
  };
}

export function engine(speed: number, throttle: number, rpm: number, limited: boolean, dt: number) {
  const target = Math.min(7400, 950 + Math.abs(speed) * 250 + throttle * 500);
  const next = rpm + (target - rpm) * (1 - Math.exp(-dt * 8));
  return { rpm: next, limited: throttle > 0 && (limited ? next > 6900 : next >= 7200) };
}
