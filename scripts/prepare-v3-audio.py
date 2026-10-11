"""Offline V3 engine and city edits. See audio-credits.txt. numpy only."""
import wave,subprocess,io
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1];rate=22050

def read(path):
 with wave.open(io.BytesIO(path) if isinstance(path,bytes) else str(path)) as w:
  sr=w.getframerate();ch=w.getnchannels();x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float).reshape(-1,ch).mean(axis=1)/32768
 return np.interp(np.arange(0,len(x),sr/rate),np.arange(len(x)),x)
def write(path,x):
 with wave.open(str(path),'wb') as w:w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes((np.clip(x,-.9,.9)*32767).astype('<i2').tobytes())
def loop(x,cut,level):
 x=x.copy();x-=x.mean();f=np.fft.rfftfreq(len(x),1/rate);x=np.fft.irfft(np.fft.rfft(x)*(1-np.exp(-(f/75)**4))/(1+(f/cut)**6),n=len(x));x=np.tanh(x*2)
 n=min(int(.07*rate),len(x)//8);a=np.linspace(0,1,n);x=np.r_[x[n:-n],x[-n:]*(1-a)+x[:n]*a];x*=min(.65/max(abs(x)),level/max(.001,np.sqrt(np.mean(x*x))));x[-128:]+=(x[0]-x[-1])*np.linspace(0,1,128);return x
source=read(root/'scripts/audio-source/car-engine-cc0.wav')
old=read(subprocess.check_output(['git','show','6561c41:public/rally/recorded-car-0-load.wav'],cwd=root))
for car,pitch in enumerate([.96,1.08,1.02,1.14]):
 for layer,mul,cut,level in [('idle',.7,850,.12),('load',1.2,2600,.23),('lift',.85,1400,.15)]:
  x=np.interp(np.arange(0,len(source),pitch*mul),np.arange(len(source)),source)
  write(root/f'public/rally/recorded-car-{car}-{layer}.wav',loop(x,cut,level))
# Preview: accelerate through gears, hold, corner, and lift. Before/after identical schedule.
for label,x in [('before',old),('after',read(root/'public/rally/recorded-car-0-load.wav'))]:
 t=np.arange(rate*10)/rate;speed=np.interp(t,[0,1,3,4.5,5.5,7,10],[0,4,23,24,12,24,15]);rev=np.mod(speed,7)/7;pitch=.85+rev*.9 if label=='after' else .72+speed*.043+.42
 position=np.cumsum(pitch);preview=np.interp(position%len(x),np.arange(len(x)),x)*np.where(t<7,.35,.12)*np.minimum(1,t*5)*np.minimum(1,(10-t)*4)
 write(Path('/tmp')/f'rally-v3-{label}.wav',preview)
city=Path('/tmp/rally-nyc.wav')
if city.exists():
 x=read(city)[rate*15:rate*35];write(root/'public/rally/nyc-ambience.wav',loop(x,2200,.025))
