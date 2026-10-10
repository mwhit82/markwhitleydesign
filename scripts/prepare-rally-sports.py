"""CC0 sports crowd by FoolBoyMedia; source and licence in public/rally/audio-credits.txt.
Offline conversion only. Run using Python with numpy/soundfile.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1]
raw,sr=sf.read(root/'scripts/audio-source/sports-crowd-cc0.mp3',always_2d=True)
rate=22050
mono=raw.mean(axis=1)
a=np.interp(np.arange(int(len(mono)*rate/sr))*sr/rate,np.arange(len(mono)),mono)
for name,start,duration,loop in [('crowd-bed',8,10,True),('crowd-cheer',0,3,False),('crowd-applause',1,10,False)]:
 out=a[int(start*rate):int((start+duration)*rate)].copy()
 if loop:
  n=rate//2
  mix=np.linspace(0,1,n)
  out=np.concatenate((out[n:-n],out[-n:]*(1-mix)+out[:n]*mix))
 else:
  n=rate//8;out[:n]*=np.linspace(0,1,n);out[-n:]*=np.linspace(1,0,n)
 out*=.7/max(.001,np.max(np.abs(out)))
 sf.write(root/'public/rally'/f'{name}.wav',out,rate,subtype='PCM_16')
 print(name,len(out)/rate)
