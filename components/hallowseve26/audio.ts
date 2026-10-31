import {riverX,type GameEvent,type Point} from './simulation';
type Cue='click'|'close'|'select'|'invalid'|'place'|'hammer'|'complete'|'upgrade'|'recruit'|'chop'|'mine'|'saw'|'craft'|'clash'|'magic'|'step'|'cannon';
const files:Record<Cue,string>={click:'click1.wav',close:'click3.wav',select:'switch5.wav',invalid:'switch10.wav',place:'hammer.wav',hammer:'hammer.wav',complete:'switch15.wav',upgrade:'switch15.wav',recruit:'switch5.wav',chop:'chop.wav',mine:'mine.wav',saw:'saw.wav',craft:'craft.wav',clash:'clash.wav',magic:'magic.wav',step:'step.wav',cannon:'cannon.wav'};
/** Gesture-gated, bounded audio; asset failure never blocks the simulation. */
export class ChristmasAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private music:GainNode|null=null;
 private effects:GainNode|null=null;
 private ambience:GainNode|null=null;
 private buffers=new Map<string,Promise<AudioBuffer|null>>();
 private loops=new Map<string,{source:AudioBufferSourceNode;gain:GainNode}>();
 private voices=0;
 private last=new Map<string,number>();
 private closed=false;
 private scene='day';
 private duck=false;
 private previewTimer:ReturnType<typeof setTimeout>|null=null;
 private previewing=false;
 private river:{source:AudioBufferSourceNode;gain:GainNode;panner:StereoPannerNode}|null=null;
 private riverLoading=false;
 private listening:Point & {zoom?:number}={x:0,z:0,zoom:18};
 ambienceVolume=.5;
 muted=false;musicVolume=.45;sfxVolume=.65;
 status='Sound starts when you play.';
 async start(){try{if(this.closed)return;this.context??=new AudioContext();if(!this.master){const c=this.context;this.master=c.createGain();this.master.connect(c.destination);this.music=c.createGain();this.music.connect(this.master);this.effects=c.createGain();this.effects.connect(this.master);this.ambience=c.createGain();this.ambience.connect(this.master);this.apply();}await this.context.resume();void this.ensureMusic();void this.ensureRiver();for(const file of new Set(Object.values(files)))void this.buffer(file);}catch{this.status='Audio unavailable; the game is still playable.';}}
 private buffer(file:string){if(!this.buffers.has(file))this.buffers.set(file,(async()=>{try{const response=await fetch('/hallowseve26/audio/'+file);if(!response.ok)throw Error();const data=await response.arrayBuffer();if(!this.context||this.closed)return null;return await this.context.decodeAudioData(data);}catch{this.status='Some audio could not load. Check your connection.';return null;}})());return this.buffers.get(file)!;}
 private async ensureMusic(){for(const [name,file] of [['day','day.m4a'],['night','night.m4a']]){if(this.loops.has(name))continue;const buffer=await this.buffer(file);const c=this.context;if(!buffer||!c||this.closed||this.loops.has(name))continue;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.music!);gain.gain.value=0;this.loops.set(name,{source,gain});source.start();this.mix();}if(this.loops.size===2)this.status='Wintery Loop · Emma_MA / Creepy Ambient Loop · epb9000';}
 settings(muted:boolean,music:number,sfx:number,ambience=.5){this.muted=muted;this.musicVolume=music;this.sfxVolume=sfx;this.ambienceVolume=ambience;this.apply();}
 private apply(){const c=this.context;if(!c)return;this.master?.gain.setTargetAtTime(this.muted?0:.75,c.currentTime,.04);this.music?.gain.setTargetAtTime(this.musicVolume*(this.duck?.42:1),c.currentTime,.15);this.effects?.gain.setTargetAtTime(this.sfxVolume,c.currentTime,.04);this.ambience?.gain.setTargetAtTime(this.duck?0:this.ambienceVolume,c.currentTime,.1);}
 setScene(night:boolean,duck:boolean){const next=night?'night':'day';const changed=this.scene!==next;this.scene=next;this.duck=duck;this.apply();if(changed&&!this.previewing)this.mix();}
 private mix(target=this.scene){const c=this.context;if(!c)return;for(const [name,{gain}] of this.loops){gain.gain.cancelAndHoldAtTime(c.currentTime);gain.gain.linearRampToValueAtTime(name===target?1:0,c.currentTime+3);}}
 async preview(night:boolean){await this.start();await this.ensureMusic();this.previewing=true;this.mix(night?'night':'day');if(this.previewTimer)clearTimeout(this.previewTimer);this.previewTimer=setTimeout(()=>{this.previewing=false;this.mix();},9000);}
 async cue(cue:Cue,volume=1,pan=0){const c=this.context;const world=['hammer','chop','mine','saw','craft','step'].includes(cue);if(!c||c.state!=='running'||this.muted||volume<=.01||this.voices>=(world?6:8))return;const now=performance.now();if(now-(this.last.get(cue)??-Infinity)<(world?(cue==='step'?180:450):65))return;this.last.set(cue,now);const buffer=await this.buffer(files[cue]);if(!buffer||this.closed||performance.now()-now>300||c.state!=='running'||this.muted||this.voices>=8)return;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=cue==='complete'?1.35:cue==='invalid'?.7:1;gain.gain.value=Math.min(1,volume)*(cue==='hammer'?.3:.65);source.connect(gain);const panner=c.createStereoPanner();panner.pan.value=pan;gain.connect(panner);panner.connect(world?this.ambience!:this.effects!);this.voices++;source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();this.voices--;};source.start();}
 consume(events:GameEvent[],listener:Point & {zoom?:number}){this.environment(listener);const ordered=[...events].sort((a,b)=>Number(['clash','magic','cannon'].includes(b.type))-Number(['clash','magic','cannon'].includes(a.type)));for(const e of ordered){const spatial=this.spatial(e);void this.cue(e.type,spatial.volume,spatial.pan);}}
 private spatial(p:Point){const dx=p.x-this.listening.x,dz=p.z-this.listening.z,range=Math.max(8,Math.min(24,300/(this.listening.zoom??18))),d=Math.hypot(dx,dz);return {volume:Math.max(0,1-d/range)**2,pan:Math.max(-.85,Math.min(.85,(dx-dz)/range))};}
 environment(listener:Point & {zoom?:number}){this.listening=listener;if(!this.river||!this.context)return;let nearest={x:riverX(0),z:0},best=Infinity;for(let z=-28;z<=28;z+=2){const x=riverX(z),d=Math.hypot(x-listener.x,z-listener.z);if(d<best){best=d;nearest={x,z};}}const spatial=this.spatial(nearest);this.river.gain.gain.setTargetAtTime(spatial.volume*.42,this.context.currentTime,.4);this.river.panner.pan.setTargetAtTime(spatial.pan,this.context.currentTime,.4);}
 private async ensureRiver(){if(this.river||this.riverLoading)return;this.riverLoading=true;const buffer=await this.buffer('river.wav'),c=this.context;if(!buffer||!c||this.closed)return;const source=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(panner);panner.connect(this.ambience!);source.start();this.river={source,gain,panner};this.environment(this.listening);}

 suspend(){void this.context?.suspend();}
 resume(){if(this.context&&!this.closed)void this.context.resume().catch(()=>{});}
 close(){this.closed=true;if(this.previewTimer)clearTimeout(this.previewTimer);void this.context?.close();this.context=null;this.loops.clear();this.buffers.clear();}
}
