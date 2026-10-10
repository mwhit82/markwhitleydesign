"""Prepare CC0 Ambient Bird Sounds by isaiah658; requires macOS afconvert."""
from pathlib import Path
import subprocess, tempfile, wave, struct
root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temp:
    decoded = Path(temp) / 'birds.wav'
    subprocess.run(['afconvert','-f','WAVE','-d','LEI16@22050','-c','1',str(root/'scripts/audio-source/birds-isaiah658.ogg'),str(decoded)],check=True)
    with wave.open(str(decoded),'rb') as f:
        rate=f.getframerate()
        values=list(struct.unpack('<'+'h'*f.getnframes(),f.readframes(f.getnframes())))
    values=values[:rate*24]
    # Crossfade loop boundary and bake quiet level into the file for iOS media playback.
    overlap=rate
    join=[int(values[-overlap+i]*(1-i/overlap)+values[i]*(i/overlap)) for i in range(overlap)]
    values=values[overlap:-overlap]+join
    gain=2400/max(abs(v) for v in values)
    with wave.open(str(root/'public/rally/forest-birds.wav'),'wb') as f:
        f.setparams((1,2,rate,0,'NONE','not compressed'))
        f.writeframes(struct.pack('<'+'h'*len(values),*[int(v*gain) for v in values]))
    print('Forest loop:',round(len(values)/rate,2),'seconds, peak 2400/32768')
