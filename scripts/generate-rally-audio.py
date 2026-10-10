"""Generate original, deterministic rally sound layers; no external recordings."""
import math, random, struct, wave
from pathlib import Path
RATE = 22050
OUT = Path(__file__).resolve().parents[1] / 'public' / 'rally'
OUT.mkdir(exist_ok=True)
def save(name, data, peak=None):
    mean = sum(data) / len(data)
    data = [v - mean for v in data]
    if peak:
        scale = peak / max(abs(v) for v in data)
        data = [v * scale for v in data]
    with wave.open(str(OUT / name), 'wb') as f:
        f.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        f.writeframes(b''.join(struct.pack('<h', int(max(-.95, min(.95, v)) * 32767)) for v in data))
for car, frequency in enumerate([22, 26, 24, 28]):
    offsets = [0, .20, .5, .70] if car == 0 else [0, .25, .5, .75]
    for loaded in [False, True]:
        data = []
        filtered = 0
        for i in range(RATE * 2):
            t = i / RATE
            phase = (t * frequency) % 1
            exhaust = sum((1 if j % 2 == 0 else .72 + .06 * car) * math.exp(-((phase - offset) % 1) * (42 if loaded else 65)) for j, offset in enumerate(offsets))
            texture = sum(math.sin(2 * math.pi * h * t + h * .13) for h in [743 + car * 13, 1093, 1777, 2311]) / 4
            raw = exhaust * (1 + (.20 if loaded else .08) * texture) + .045 * math.sin(2 * math.pi * frequency * 2 * t)
            filtered += (.36 if loaded else .16) * (raw - filtered)
            data.append(math.tanh(filtered * (2.8 if loaded else 1.8)))
        save(f'car-{car}-{"load" if loaded else "idle"}.wav', data[RATE:], .68 if loaded else .48)
rng = random.Random(82)
noise = []; low = 0
for i in range(RATE):
    sample = rng.uniform(-1, 1); low += .16 * (sample - low)
    edge = min(1, i / 180, (RATE - 1 - i) / 180)
    noise.append((sample - low) * (.5 + .5 * math.sin(i * .021) ** 2) * edge)
save('gravel.wav', noise, .55)
forest = []
for i in range(RATE * 10):
    t = i / RATE
    wind = sum(math.sin(2 * math.pi * f * t + f * .7) for f in [73, 139, 223, 347, 479, 613, 863, 1097, 1423, 1823]) * .002
    wind *= .65 + .35 * math.sin(2 * math.pi * t / 10) ** 2
    birds = 0
    for at, base in [(1.2, 2200), (1.6, 2600), (5.8, 1900), (6.15, 2350), (8.6, 2700)]:
        u = t - at
        if 0 < u < .16:
            birds += .017 * math.sin(math.pi * u / .16) ** 2 * math.sin(2 * math.pi * (base * u + 2200 * u * u))
    forest.append(wind + birds)
save('forest.wav', forest)
print('Generated eight engine layers, gravel, and forest ambience.')
