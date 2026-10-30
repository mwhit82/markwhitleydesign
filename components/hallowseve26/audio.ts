import type {GameEvent,Point} from './simulation';
type Cue='click'|'close'|'select'|'invalid'|'place'|'hammer'|'complete'|'upgrade'|'recruit';
const files:Record<Cue,string>={click:'click1.wav',close:'click3.wav',select:'switch5.wav',invalid:'switch10.wav',place:'hammer.wav',hammer:'hammer.wav',complete:'switch15.wav',upgrade:'switch15.wav',recruit:'switch5.wav'};
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
 muted=false;musicVolume=.45;sfxVolume=.65;
 status='Sound starts when you play.';
 async start(){try{if(this.closed)return;this.context??=new AudioContext();if(!this.master){const c=this.context;this.master=c.createGain();this.master.connect(c.destination);this.music=c.createGain();this.music.connect(this.master);this.effects=c.createGain();this.effects.connect(this.master);this.ambience=c.createGain();this.ambience.connect(this.master);this.apply();}await this.context.resume();void this.ensureMusic();for(const file of new Set(Object.values(files)))void this.buffer(file);}catch{this.status='Audio unavailable; the game is still playable.';}}
 private buffer(file:string){if(!this.buffers.has(file))this.buffers.set(file,(async()=>{try{const response=await fetch('/hallowseve26/audio/'+file);if(!response.ok)throw Error();const data=await response.arrayBuffer();if(!this.context||this.closed)return null;return await this.context.decodeAudioData(data);}catch{this.status='Some audio could not load. Check your connection.';return null;}})());return this.buffers.get(file)!;}
 private async ensureMusic(){for(const [name,file] of [['day','day.m4a'],['night','night.m4a']]){if(this.loops.has(name))continue;const buffer=await this.buffer(file);const c=this.context;if(!buffer||!c||this.closed||this.loops.has(name))continue;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.music!);gain.gain.value=0;this.loops.set(name,{source,gain});source.start();this.mix();}if(this.loops.size===2)this.status='Wintery Loop · Emma_MA / Creepy Ambient Loop · epb9000';}
 settings(muted:boolean,music:number,sfx:number){this.muted=muted;this.musicVolume=music;this.sfxVolume=sfx;this.apply();}
 private apply(){const c=this.context;if(!c)return;this.master?.gain.setTargetAtTime(this.muted?0:.75,c.currentTime,.04);this.music?.gain.setTargetAtTime(this.musicVolume*(this.duck?.42:1),c.currentTime,.15);this.effects?.gain.setTargetAtTime(this.sfxVolume,c.currentTime,.04);this.ambience?.gain.setTargetAtTime(this.duck?0:this.sfxVolume,c.currentTime,.1);}
 setScene(night:boolean,duck:boolean){const next=night?'night':'day';const changed=this.scene!==next;this.scene=next;this.duck=duck;this.apply();if(changed&&!this.previewing)this.mix();}
 private mix(target=this.scene){const c=this.context;if(!c)return;for(const [name,{gain}] of this.loops){gain.gain.cancelAndHoldAtTime(c.currentTime);gain.gain.linearRampToValueAtTime(name===target?1:0,c.currentTime+3);}}
 async preview(night:boolean){await this.start();await this.ensureMusic();this.previewing=true;this.mix(night?'night':'day');if(this.previewTimer)clearTimeout(this.previewTimer);this.previewTimer=setTimeout(()=>{this.previewing=false;this.mix();},9000);}
 async cue(cue:Cue,volume=1){const c=this.context;if(!c||c.state!=='running'||this.muted||this.voices>=8)return;const now=performance.now();if(now-(this.last.get(cue)??-Infinity)<(cue==='hammer'?650:65))return;this.last.set(cue,now);const buffer=await this.buffer(files[cue]);if(!buffer||this.closed||performance.now()-now>300||c.state!=='running'||this.muted||this.voices>=8)return;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=cue==='complete'?1.35:cue==='invalid'?.7:1;gain.gain.value=Math.min(1,volume)*(cue==='hammer'?.3:.65);source.connect(gain);gain.connect(cue==='hammer'?this.ambience!:this.effects!);this.voices++;source.onended=()=>{source.disconnect();gain.disconnect();this.voices--;};source.start();}
 consume(events:GameEvent[],listener:Point){for(const e of events)void this.cue(e.type,Math.max(.08,1/(1+Math.hypot(e.x-listener.x,e.z-listener.z)/8)));}
 suspend(){void this.context?.suspend();}
 resume(){if(this.context&&!this.closed)void this.context.resume().catch(()=>{});}
 close(){this.closed=true;if(this.previewTimer)clearTimeout(this.previewTimer);void this.context?.close();this.context=null;this.loops.clear();this.buffers.clear();}
}
