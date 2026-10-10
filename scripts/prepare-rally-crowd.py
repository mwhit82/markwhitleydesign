"""Prepare three CC0 crowd recordings; requires numpy and soundfile."""
from pathlib import Path
import tempfile,wave,struct
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1]
for name,ext,duration,loop in [('crowd-bed','ogg',12,True),('crowd-cheer','ogg',4,False),('crowd-applause','wav',6,False)]:
 with tempfile.TemporaryDirectory() as temp:
  raw,source_rate=sf.read(str(root/'scripts/audio-source'/f'{name}.{ext}'),always_2d=True)
  mono=raw.mean(axis=1);rate=22050
  resampled=np.interp(np.arange(min(int(len(mono)*rate/source_rate),rate*duration))*source_rate/rate,np.arange(len(mono)),mono)
  samples=list(resampled*32767)
  if loop:
   overlap=rate//2;join=[samples[-overlap+i]*(1-i/overlap)+samples[i]*(i/overlap) for i in range(overlap)];samples=samples[overlap:-overlap]+join
   # Soften speech transients to sit underneath engine and environmental ambience.
   smooth=0
   for i,v in enumerate(samples):smooth+=.3*(v-smooth);samples[i]=smooth
  else:
   fade=min(rate//8,len(samples)//4)
   for i in range(fade):samples[i]*=i/fade;samples[-i-1]*=i/fade
  gain=18000/max(1,max(abs(v) for v in samples))
  with wave.open(str(root/'public/rally'/f'{name}.wav'),'wb') as f:
   f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(struct.pack('<'+'h'*len(samples),*[int(v*gain) for v in samples]))
  print(name,round(len(samples)/rate,2),'seconds')
