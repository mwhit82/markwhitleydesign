"""Prepare recorded CC0 engine layers and original ambience; see public/rally/audio-credits.txt."""
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
# CC0 recording by domasx2, derived from a public-domain car recording.
# Offline processing only: periodic resampling, DC removal, EQ and saturation.
source = Path(__file__).resolve().parent / 'audio-source' / 'car-engine-cc0.wav'
with wave.open(str(source), 'rb') as recording:
    assert recording.getsampwidth() == 2
    channels = recording.getnchannels()
    source_rate = recording.getframerate()
    raw = struct.unpack('<' + 'h' * (recording.getnframes() * channels), recording.readframes(recording.getnframes()))
    original = [sum(raw[i:i+channels]) / channels / 32768 for i in range(0, len(raw), channels)]
mean = sum(original) / len(original)
original = [x - mean for x in original]
peak = max(abs(x) for x in original)
original = [x / peak for x in original]
# Equal-power overlap softens the original recording's loop boundary.
fade = min(int(source_rate * .025), len(original) // 8)
body = original[fade:-fade]
join = [original[-fade+i] * (1-i/fade) + original[i] * (i/fade) for i in range(fade)]
original = body + join
for car, pitch in enumerate([.88, 1.04, .98, 1.12]):
    length = round(len(original) * RATE / source_rate / pitch)
    sampled = []
    for i in range(length):
        pos = i * len(original) / length
        lo = int(pos)
        sampled.append(original[lo] * (1-(pos-lo)) + original[(lo+1) % len(original)] * (pos-lo))
    for loaded in [False, True]:
        low = 0
        data = []
        for i in range(length * 3):
            value = sampled[i % length]
            low += (.2 if loaded else .09) * (value-low)
            shaped = low + (value-low) * ([.85, 1.2, .65, 1.05][car] if loaded else .14)
            value = math.tanh(shaped * (1.8 if loaded else .9))
            if i >= length * 2: data.append(value)
        save(f'recorded-car-{car}-{"load" if loaded else "idle"}.wav', data, .68 if loaded else .48)
rng = random.Random(82)
noise = []; low = 0
for i in range(RATE):
    sample = rng.uniform(-1, 1); low += .16 * (sample - low)
    edge = min(1, i / 180, (RATE - 1 - i) / 180)
    noise.append((sample - low) * (.5 + .5 * math.sin(i * .021) ** 2) * edge)
save('gravel.wav', noise, .55)
forest = []
wind_rng = random.Random(419)
wind_low = 0
for i in range(RATE * 10):
    t = i / RATE
    # Quiet broadband air instead of sustained musical tones.
    wind_low += .035 * (wind_rng.uniform(-1, 1) - wind_low)
    edge = min(1, i / (RATE * .3), (RATE * 10 - 1 - i) / (RATE * .3))
    wind = wind_low * .008 * edge
    birds = 0
    for at, base in [(1.2, 2200), (1.6, 2600), (5.8, 1900), (6.15, 2350), (8.6, 2700)]:
        u = t - at
        if 0 < u < .16:
            birds += .017 * math.sin(math.pi * u / .16) ** 2 * math.sin(2 * math.pi * (base * u + 2200 * u * u))
    forest.append(wind + birds)
save('forest-air.wav', forest)
print('Generated eight engine layers, gravel, and forest ambience.')
