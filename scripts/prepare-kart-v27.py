"""Stylised high-rev kart edit from qubodup's CC0 venue recording.
Conventional offline filtering, resampling and seam blending; no live synthesis.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1];rate=22050
raw,sr=sf.read(root/'scripts/audio-source/kart-interior-cc0.mp3',always_2d=True)
a=raw.mean(axis=1)
for name,start,pitch,level in [('idle',192,1.75,.12),('load',25,3.4,.17),('lift',86,2.65,.13)]:
 x=a[int(start*sr):int((start+4.5)*sr)].copy();x-=x.mean()
 f=np.fft.rfftfreq(len(x),1/sr)
 # Keep the engine-rich low band; remove speech hiss and room rumble before pitching.
 response=(1-np.exp(-(f/105)**6))/(1+(f/920)**8)
 x=np.fft.irfft(np.fft.rfft(x)*response,n=len(x))
 x=np.interp(np.arange(0,len(x),sr/rate*pitch),np.arange(len(x)),x)
 f=np.fft.rfftfreq(len(x),1/rate)
 x=np.fft.irfft(np.fft.rfft(x)/(1+(f/3300)**6),n=len(x))
 n=int(.16*rate);blend=.5-.5*np.cos(np.linspace(0,np.pi,n));x=np.concatenate([x[n:-n],x[-n:]*(1-blend)+x[:n]*blend])
 x*=min(.65/max(abs(x)),level/max(.001,np.sqrt(np.mean(x*x))))
 # Remove the tiny residual edge mismatch without introducing an audible transient.
 n=128;x[-n:]+=(x[0]-x[-1])*np.linspace(0,1,n)
 sf.write(root/f'public/rally/recorded-car-4-{name}.wav',x,rate,subtype='PCM_16')
 print(name,round(len(x)/rate,2),'seconds, peak',round(float(max(abs(x))),3),'seam',abs(float(x[-1]-x[0])))
