"""Warm stylised sports-car kart layers; existing domasx2 CC0 recording.
Offline only. Original, gently band-limited tyre friction cue; no live synthesis.
"""
from pathlib import Path
import wave
import numpy as np
root=Path(__file__).resolve().parents[1]; rate=22050
with wave.open(str(root/'scripts/audio-source/car-engine-cc0.wav')) as w:
 sr=w.getframerate();channels=w.getnchannels()
 raw=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float).reshape(-1,channels).mean(axis=1)/32768

def save(name,x,level):
 x-=x.mean();n=min(int(.08*rate),len(x)//8)
 blend=.5-.5*np.cos(np.linspace(0,np.pi,n))
 x=np.concatenate([x[n:-n],x[-n:]*(1-blend)+x[:n]*blend])
 x*=min(.65/max(abs(x)),level/max(.001,np.sqrt(np.mean(x*x))))
 x[-128:]+=(x[0]-x[-1])*np.linspace(0,1,128)
 with wave.open(str(root/f'public/rally/{name}.wav'),'wb') as w:
  w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes((x*32767).astype('<i2').tobytes())
 print(name,'seconds',round(len(x)/rate,2),'peak',round(float(max(abs(x))),3))
for name,pitch,cut,level in [('idle',.68,800,.16),('load',.95,1800,.23),('lift',.78,1150,.16)]:
 x=np.interp(np.arange(0,len(raw),sr/rate*pitch),np.arange(len(raw)),raw)
 f=np.fft.rfftfreq(len(x),1/rate)
 x=np.fft.irfft(np.fft.rfft(x)*(1-np.exp(-(f/65)**4))/(1+(f/cut)**6),n=len(x))
 x=np.tanh(x*2)
 save(f'recorded-car-4-{name}',x,level)
# Soft rubberchirp with fluctuating friction, instead of a pure piercing tone.
t=np.arange(rate*2)/rate;rng=np.random.default_rng(271)
phase=2*np.pi*(690*t+9*np.sin(2*np.pi*3*t)+3*np.sin(2*np.pi*7*t))
x=(np.sin(phase)+.17*np.sin(phase*2))*(.7+.15*np.sin(2*np.pi*2*t))+.3*rng.normal(size=len(t))
f=np.fft.rfftfreq(len(x),1/rate)
x=np.fft.irfft(np.fft.rfft(x)*(1-np.exp(-(f/320)**4))/(1+(f/1600)**8),n=len(x))
save('kart-tyres',x,.13)
