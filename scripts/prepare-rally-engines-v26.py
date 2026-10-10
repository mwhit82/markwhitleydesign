"""Offline engine preparation. Sources/licences: public/rally/audio-credits.txt.
Select steady engine regions by spectral stationarity; crossfade seams, remove DC,
limit harsh high-frequency content. No work occurs inside the game loop.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1];rate=22050

def read(name):
 raw,sr=sf.read(root/'scripts/audio-source'/name,always_2d=True)
 mono=raw.mean(axis=1)
 return np.interp(np.arange(int(len(mono)*rate/sr))*sr/rate,np.arange(len(mono)),mono)

def regions(a):
 candidates=[]
 for start in np.arange(3,len(a)/rate-4,1):
  x=a[int(start*rate):int((start+2.4)*rate)]
  frames=np.array_split(x,12);powers=np.array([np.mean(f*f) for f in frames]);rms=np.sqrt(powers.mean())
  if rms<.015:continue
  spectra=np.array([abs(np.fft.rfft(f[:2048]*np.hanning(min(2048,len(f))))) for f in frames])
  freqs=np.fft.rfftfreq(2048,1/rate);engine=(freqs>65)&(freqs<1300)
  energy=spectra[:,engine].mean(axis=0)**2
  peak=float(np.sum(freqs[engine]*energy)/np.sum(energy))
  stationarity=float(np.std(powers)/max(1e-8,powers.mean()))
  variation=float(np.mean(np.std(spectra,axis=0))/max(1e-8,np.mean(spectra)))
  candidates.append((stationarity+variation,start,peak))
 candidates.sort();return candidates

def loop(a,start,tone=1,lowpass=2200):
 x=a[int(start*rate):int((start+2.4)*rate)].copy();x-=x.mean()
 frequencies=np.fft.rfftfreq(len(x),1/rate)
 response=(1-np.exp(-(frequencies/65)**4))/(1+(frequencies/lowpass)**4)
 x=np.fft.irfft(np.fft.rfft(x)*response,n=len(x))
 n=int(.18*rate);blend=np.linspace(0,1,n)
 x=np.concatenate([x[n:-n],x[-n:]*(1-blend)+x[:n]*blend])
 if tone!=1:x=np.interp(np.arange(0,len(x),tone),np.arange(len(x)),x)
 n=128;x[-n:]+=(x[0]-x[-1])*np.linspace(0,1,n)
 x*=min(.65/max(.001,np.max(abs(x))),.18/max(.001,np.sqrt(np.mean(x*x))))
 return x

for name,ids in [('rally-interior-ccby.mp3',range(4)),('kart-interior-cc0.mp3',[4])]:
 a=read(name);choices=regions(a);pool=choices[:max(12,len(choices)//5)]
 low=min(pool,key=lambda c:c[2]);high=max(pool,key=lambda c:c[2]);middle=min(pool,key=lambda c:abs(c[2]-(low[2]+high[2])/2))
 print(name,'idle/load/lift source seconds:',low[1],high[1],middle[1])
 for car in ids:
  tone=[.94,1.02,.98,1.06,1][car]
  for layer,source,cutoff in [('idle',low,1300),('load',high,2800),('lift',middle,1800)]:
   x=loop(a,source[1],tone,cutoff)
   sf.write(root/'public/rally'/f'recorded-car-{car}-{layer}.wav',x,rate,subtype='PCM_16')
