"""Original offline procedural foley, deterministic and free of downloaded code/media."""
import math, random, wave, struct
from pathlib import Path
root=Path('public/hallowseve26/audio');rate=22050
for name,duration in [('river',8),('chop',.3),('mine',.4),('saw',.65),('craft',.22),('clash',.5),('magic',.7),('step',.15),('cannon',.8)]:
 rng=random.Random(261225);samples=[];low=0
 for i in range(int(rate*duration)):
  t=i/rate;n=rng.uniform(-1,1);low=.93*low+.07*n
  if name=='river':
   # Bed of filtered rushing noise with quiet, irregular bubble resonances.
   x=(low*.7+n*.08)*(1+.12*math.sin(t*2*math.pi/8))+.02*math.sin(2*math.pi*(430*t+8*math.sin(t*3)))
  elif name in ['mine','clash']:
   x=sum(math.sin(2*math.pi*f*t)*math.exp(-t*d) for f,d in [(620,16),(1437,10),(2311,18)])*.16+n*.18*math.exp(-t*45)
  elif name=='chop':x=(math.sin(2*math.pi*170*t)*.6+n*.5)*math.exp(-t*24)
  elif name=='step':x=(low+n*.06)*math.exp(-t*30)*1.5
  elif name=='saw':x=(n*.18+math.sin(2*math.pi*95*t)*.08)*math.sin(math.pi*t/duration)**2
  elif name=='craft':x=(math.sin(2*math.pi*760*t)+.3*math.sin(2*math.pi*1180*t))*.24*math.exp(-t*28)
  elif name=='magic':x=sum(math.sin(2*math.pi*f*t) for f in [523,659,784])*.1*math.sin(math.pi*t/duration)**2
  else:x=(low*2+math.sin(2*math.pi*(80*t-25*t*t))*.24)*math.exp(-t*7)
  if name!='river':x*=min(1,t/.003)
  samples.append(x)
 if name=='river':
  # Equal-power wrap blend: avoid a discontinuity at the loop boundary.
  n=int(rate*.08)
  for i in range(n):
   f=i/(n-1);value=samples[-n+i]*(1-f)+samples[i]*f;samples[-n+i]=value;samples[i]=value
  samples[0]=samples[-1]=0
  for i in range(64):samples[i]*=i/64;samples[-1-i]*=i/64
 with wave.open(str(root/(name+'.wav')),'wb') as out:
  out.setparams((1,2,rate,0,'NONE','not compressed'));out.writeframes(b''.join(struct.pack('<h',int(max(-.95,min(.95,x))*32767)) for x in samples))
