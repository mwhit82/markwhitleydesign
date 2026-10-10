"""Conventional edit only: trim published phrase regions, EQ, fades, normalise.
SentientMattress / CC BY 4.0. No voice synthesis or generative processing.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1]
x,sr=sf.read(root/'scripts/audio-source/codriver-sentientmattress-ccby.mp3')
regions={'1-left':(11.12,11.86),'1-right':(16.64,17.34),'2-left':(22.08,22.78),'2-right':(27.24,27.94),'3-left':(32.92,33.76),'3-right':(38,38.86),'4-left':(43.48,44.26),'4-right':(48.98,49.8),'5-left':(54.46,55.32),'5-right':(60.54,61.38),'crest':(77.48,78.14),'hairpin-left':(149.52,150.42),'hairpin-right':(158.14,159.08),'finish':(177.1,177.8)}
into={'1-left':(12.74,13.66),'1-right':(18.2,19.18),'2-left':(23.48,24.44),'2-right':(28.78,29.76),'3-left':(34.36,35.4),'3-right':(39.6,40.62),'4-left':(45,46.02),'4-right':(50.4,51.42),'5-left':(55.92,56.96),'5-right':(62.04,63.06),'crest':(79.34,80.22),'hairpin-left':(151.16,152.38),'hairpin-right':(159.9,161.04)}
regions.update({'into-'+k:v for k,v in into.items()})
for name,(a,b) in regions.items():
 y=x[int(a*sr):int(b*sr)].copy();y-=y.mean();f=np.fft.rfftfreq(len(y),1/sr)
 y=np.fft.irfft(np.fft.rfft(y)*(1-np.exp(-(f/220)**4))/(1+(f/3400)**6),n=len(y))
 y*=min(.8/max(abs(y)),.2/max(.001,np.sqrt(np.mean(y*y))))
 n=int(.012*sr);y[:n]*=np.linspace(0,1,n);y[-n:]*=np.linspace(1,0,n)
 y=np.interp(np.arange(0,len(y),sr/22050),np.arange(len(y)),y)
 sf.write(root/f'public/rally/voice-{name}.wav',y,22050,subtype='PCM_16')
print('Prepared',len(regions),'bounded voice clips')
