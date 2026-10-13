"""Offline CC0 engine treatments; see audio-credits.txt. No runtime synthesis."""
import math, struct, wave
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with wave.open(str(root/'scripts/audio-source/car-engine-cc0.wav'),'rb') as f:
 channels=f.getnchannels();rate=f.getframerate();raw=struct.unpack('<'+'h'*(f.getnframes()*channels),f.readframes(f.getnframes()))
source=[sum(raw[i:i+channels])/channels/32768 for i in range(0,len(raw),channels)]
sr=22050
for voice in [5,6]:
 for state,pitch,gain in [('idle',.7,.22),('load',1.3,.48),('lift',.95,.30)]:
  n=sr*2;data=[];smooth=0
  for i in range(n):
   phase=i*rate/sr*pitch*(1.8 if voice==6 else .9)
   def sample(p):
    j=int(p)%len(source);u=p-int(p);return source[j]*(1-u)+source[(j+1)%len(source)]*u
   value=sample(phase)
   if voice==5:value=value*.45+sample(phase*2)*.3+sample(phase*4)*.15
   else:value=math.tanh(value*2)*.7
   smooth+=(value-smooth)*(.26 if voice==5 else .5);data.append(smooth)
  # Equal-power boundary crossfade followed by DC removal and conservative peak limiting.
  fade=512
  for i in range(fade):
   u=i/fade;data[i]=data[n-fade+i]*(1-u)+data[i]*u
  data=data[:-fade];mean=sum(data)/len(data);peak=max(abs(v-mean) for v in data) or 1
  with wave.open(str(root/f'public/rally/recorded-car-{voice}-{state}.wav'),'wb') as f:
   f.setparams((1,2,sr,0,'NONE','not compressed'));f.writeframes(b''.join(struct.pack('<h',int((v-mean)/peak*gain*32767)) for v in data))
