"""Original, short arcade cues. Generated once into PCM; no synthesis in the game loop."""
import math, wave, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/rally'
for name,notes in {'select':[(880,.045),(1320,.055)],'start':[(523,.09),(659,.09),(784,.09),(1047,.18)],'restart':[(784,.08),(523,.08),(659,.08),(1047,.13)]}.items():
    samples=[]
    for hz,duration in notes:
        n=int(duration*22050)
        for i in range(n):
            t=i/22050
            envelope=min(1,i/100,(n-1-i)/180)
            tone=sum(math.sin(2*math.pi*hz*t*k)/k for k in (1,3,5))*.5
            samples.append(int(tone*envelope*13000))
    with wave.open(str(root/f'ui-{name}.wav'),'wb') as f:
        f.setparams((1,2,22050,0,'NONE','not compressed'))
        f.writeframes(struct.pack('<'+'h'*len(samples),*samples))
