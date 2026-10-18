/** Gesture-unlocked synthesis. One context for the game; bounded voices, explicit cleanup. */
export type Cue =
  | "shot"
  | "bark"
  | "jump"
  | "knock"
  | "open"
  | "close"
  | "switch"
  | "step"
  | "scare"
  | "rumble"
  | "gulp"
  | "plastic"
  | "voice"
  | "vent"
  | "news"
  | "lean"
  | "stutter";
export class RoomAudio {
  private context: AudioContext | null = null;
  private music: {source: AudioBufferSourceNode; gain: GainNode} | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private radio: { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; pan: StereoPannerNode } | null = null;
  private radioBuffer: AudioBuffer | null = null;
  private bangBuffer: AudioBuffer | null = null;
  private bed: {
    sources: AudioScheduledSourceNode[];
    nodes: AudioNode[];
    gain: GainNode;
  } | null = null;
  muted = false;
  volume = 0.6;
  gentle = false;
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Silent play remains available. */
    }
  }
  lobbyMusic(level: number) {
    const c=this.context;
    if(!c||c.state!=="running"||this.muted||!this.volume||level<=0){
      if(this.music){const old=this.music;old.gain.gain.setTargetAtTime(0,c?.currentTime??0,.12);old.source.stop((c?.currentTime??0)+.6);old.source.onended=()=>{old.source.disconnect();old.gain.disconnect();};this.music=null;}
      return;
    }
    if(!this.music){
      if(!this.musicBuffer){
        const length=24;this.musicBuffer=c.createBuffer(1,c.sampleRate*length,c.sampleRate);const data=this.musicBuffer.getChannelData(0);
        const notes=[146.83,155.56,110,130.81,146.83,103.83,155.56,110];
        for(let i=0;i<data.length;i++){const t=i/c.sampleRate;const phrase=t%3;const n=notes[Math.floor(t/3)];const envelope=Math.sin(Math.PI*phrase/3)**2;
          const drone=(Math.sin(2*Math.PI*55*t)+Math.sin(2*Math.PI*55.125*t))*.055;
          const note=(Math.sin(2*Math.PI*n*t)+.2*Math.sin(2*Math.PI*(n*2+.3)*t))*envelope*.11;
          data[i]=(drone+note)*Math.min(1,t, length-t);
        }
      }
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.musicBuffer;source.loop=true;source.connect(gain).connect(c.destination);gain.gain.value=0;source.start();this.music={source,gain};
    }
    this.music.gain.gain.setTargetAtTime(Math.min(1,level)*this.volume,c.currentTime,.5);
  }
  private gunshot(c: AudioContext) {
    const source=c.createBufferSource(),gain=c.createGain();const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*.24),c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){const t=i/c.sampleRate;data[i]=((Math.random()*2-1)*Math.exp(-t*38)+Math.sin(2*Math.PI*90*t)*Math.exp(-t*24))*.5;}
    source.buffer=buffer;gain.gain.value=this.volume*(this.gentle?.16:.65);source.connect(gain).connect(c.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();
  }
  private noise(c: AudioContext) {
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
      data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }
  /** Band-limited, indistinct announcer cadence and intermittent radio crackle. */
  broadcast(active: boolean, level = 1, position = 0) {
    const c = this.context;
    if (!active || !c || c.state !== "running" || this.muted || this.volume <= 0) {
      if (this.radio) {
        this.radio.source.stop();
        this.radio.source.disconnect();
        this.radio.filter.disconnect();
        this.radio.gain.disconnect();
        this.radio.pan.disconnect();
        this.radio = null;
      }
      return;
    }
    if (!this.radio) {
      if (!this.radioBuffer) {
        this.radioBuffer = c.createBuffer(1, c.sampleRate * 12, c.sampleRate);
        const data = this.radioBuffer.getChannelData(0);
        let phase = 0;
        for (let i = 0; i < data.length; i++) {
          const t = i / c.sampleRate;
          phase += 2 * Math.PI * (112 + 18 * Math.sin(t * 2.7) + 8 * Math.sin(t * 13)) / c.sampleRate;
          const phrase = Math.sin(t * 1.7) > -.3 ? 1 : .05;
          const syllable = Math.pow(Math.max(0, Math.sin(t * 21 + Math.sin(t * 4))), 2);
          const voice = (Math.sin(phase) + .4 * Math.sin(phase * 3) + .18 * Math.sin(phase * 7)) * syllable * phrase;
          const crackle = (Math.random() * 2 - 1) * (Math.random() > .997 ? .8 : .055);
          const fade = Math.min(1, t * 20, (12 - t) * 20);
          data[i] = (voice * .3 + crackle) * fade;
        }
      }
      const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(), pan = c.createStereoPanner();
      source.buffer = this.radioBuffer;
      source.loop = true;
      filter.type = "bandpass";
      filter.frequency.value = 720;
      source.connect(filter).connect(gain).connect(pan).connect(c.destination);
      gain.gain.value = 0;
      source.start();
      this.radio = { source, filter, gain, pan };
    }
    this.radio.pan.pan.value = Math.max(-1, Math.min(1, position));
    this.radio.gain.gain.setTargetAtTime(this.volume * .36 * Math.max(0, Math.min(1, level)), c.currentTime, .15);
  }
  private bang(c: AudioContext) {
    if (!this.bangBuffer) {
      this.bangBuffer = c.createBuffer(1, c.sampleRate * .8, c.sampleRate);
      const data = this.bangBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / c.sampleRate;
        const impact = (Math.random() * 2 - 1) * Math.exp(-t * 65);
        const wood = Math.sin(2 * Math.PI * 83 * t) * Math.exp(-t * 12)
          + .4 * Math.sin(2 * Math.PI * 179 * t) * Math.exp(-t * 19);
        const tail = (Math.random() * 2 - 1) * Math.exp(-t * 9) * .15;
        data[i] = (impact * .55 + wood * .4 + tail) * Math.min(1, t * 1500);
      }
    }
    for (const [offset, strength] of [[0, 1], [.19, .65], [.46, .8]]) {
      const source = c.createBufferSource(), gain = c.createGain();
      source.buffer = this.bangBuffer;
      gain.gain.value = this.volume * strength * (this.gentle ? .15 : .55);
      source.connect(gain).connect(c.destination);
      this.voices.add(source);
      source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(c.currentTime + offset);
      source.stop(c.currentTime + offset + .8);
    }
  }
  ambience(level: number, cctv = false) {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      this.muted ||
      this.volume <= 0 ||
      level <= 0
    ) {
      this.stopBed();
      return;
    }
    if (!this.bed) {
      const hum = c.createOscillator(),
        fan = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        gain = c.createGain(),
        humGain = c.createGain();
      hum.frequency.value = 54;
      hum.type = "sine";
      humGain.gain.value = 0.16;
      fan.buffer = this.noise(c);
      fan.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 650;
      hum.connect(humGain).connect(gain);
      fan.connect(filter).connect(gain);
      gain.connect(c.destination);
      gain.gain.value = 0;
      hum.start();
      fan.start();
      this.bed = { sources: [hum, fan], nodes: [humGain, filter, gain], gain };
    }
    this.bed.gain.gain.setTargetAtTime(
      Math.min(1, level) * this.volume * (cctv ? 0.065 : 0.045),
      c.currentTime,
      0.4,
    );
  }
  private stopBed() {
    if (!this.bed) return;
    for (const s of this.bed.sources) {
      try {
        s.stop();
      } catch {}
      s.disconnect();
    }
    for (const n of this.bed.nodes) n.disconnect();
    this.bed = null;
  }
  private scare(c: AudioContext) {
    const buffer=c.createBuffer(1,Math.floor(c.sampleRate*.65),c.sampleRate),data=buffer.getChannelData(0);
    let phase=0;
    for(let i=0;i<data.length;i++){
      const t=i/c.sampleRate;phase+=2*Math.PI*(110+650*Math.exp(-t*9))/c.sampleRate;
      const envelope=Math.min(1,t/.004)*Math.pow(Math.max(0,1-t/.65),1.4);
      data[i]=Math.tanh(Math.sin(phase)*.7+Math.sin(phase*1.49)*.4+(Math.random()*2-1)*.45)*envelope*.5;
    }
    const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;
    gain.gain.value=this.volume*(this.gentle?.12:.6);
    source.connect(gain).connect(c.destination);this.voices.add(source);
    source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();
  }
  scream(x:number,z:number,listener:{x:number;z:number;yaw:number}) {
    const c=this.context;if(!c||this.muted||!this.volume||this.voices.size>8)return;
    const distance=Math.hypot(x-listener.x,z-listener.z);
    for(let i=0;i<3;i++){
      const source=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();
      source.type="sawtooth";source.frequency.setValueAtTime(430+i*95,c.currentTime);source.frequency.exponentialRampToValueAtTime(180+i*40,c.currentTime+1);
      gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(this.volume*(this.gentle?.015:.045)/(1+distance*.15),c.currentTime+.08);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+1.1);
      pan.pan.value=Math.max(-1,Math.min(1,((x-listener.x)*Math.cos(listener.yaw)-(z-listener.z)*Math.sin(listener.yaw))/5));
      source.connect(gain).connect(pan).connect(c.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();pan.disconnect();};source.start();source.stop(c.currentTime+1.15);
    }
  }
  play(kind: Cue, pan = 0) {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      this.muted ||
      this.volume <= 0 ||
      this.voices.size >= 12
    )
      return;
    const count =
      kind === "knock" ? 3 : kind === "bark" ? 2 : kind === "news" ? 3 : kind === "stutter" ? 2 : 1;
    if (this.voices.size + count > 12) return;
    if (kind === "shot") { this.gunshot(c); return; }
    if (kind === "knock") { this.bang(c); return; }
    if (["scare","lean","stutter"].includes(kind)) { this.scare(c); return; }
    for (let i = 0; i < count; i++) {
      const start = c.currentTime + i * (kind === "news" ? 0.18 : 0.23);
      const length =
        kind === "rumble" || kind === "vent"
          ? 1.1
          : kind === "scare" || kind === "lean"
            ? 0.45
            : kind === "gulp"
              ? 0.4
              : kind === "open"
                ? 0.55
                : kind === "close"
                  ? 0.3
                  : 0.11;
      const osc = c.createOscillator(),
        gain = c.createGain(),
        filter = c.createBiquadFilter(),
        stereo = c.createStereoPanner();
      osc.type =
        kind === "open" || kind === "plastic" ? "sawtooth" : "triangle";
      const frequency =
        kind === "bark" ? 260 : kind === "jump" ? 540 : kind === "news"
          ? [220, 277, 330][i]
          : kind === "voice"
            ? 160
            : kind === "scare"
              ? 210
              : kind === "lean"
                ? 90
                : kind === "rumble" || kind === "vent"
                  ? 60
                  : kind === "gulp"
                    ? 170
                    : kind === "step"
                      ? 75
                      : kind === "switch"
                        ? 480
                        : kind === "open"
                          ? 95
                          : 135;
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(
        kind === "news" ? frequency : 45,
        start + length,
      );
      filter.type = "lowpass";
      filter.frequency.value = kind === "news" ? 1800 : 800;
      stereo.pan.value = Math.max(-1, Math.min(1, pan));
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(
          0.0002,
          0.025 *
            this.volume *
            (this.gentle &&
            ["scare", "lean", "stutter", "rumble", "gulp"].includes(kind)
              ? 0.3
              : 1),
        ),
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(filter).connect(gain).connect(stereo).connect(c.destination);
      this.voices.add(osc);
      osc.onended = () => {
        this.voices.delete(osc);
        osc.disconnect();
        gain.disconnect();
        filter.disconnect();
        stereo.disconnect();
      };
      osc.start(start);
      osc.stop(start + length + 0.01);
    }
  }
  silence() {
    if(this.music){this.music.source.stop();this.music.source.disconnect();this.music.gain.disconnect();this.music=null;}
    this.broadcast(false);
    this.stopBed();
    for (const v of this.voices) {
      try {
        v.stop();
      } catch {}
    }
  }
  dispose() {
    this.silence();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.radioBuffer = null;
    this.musicBuffer = null;
    this.bangBuffer = null;
    this.voices.clear();
  }
  diagnostics() {
    return {
      musicSources: this.music ? 1 : 0,
      voices: this.voices.size,
      ambientSources: this.bed?.sources.length ?? 0,
      broadcastSources: this.radio ? 1 : 0,
      context: this.context?.state ?? "locked",
    };
  }
}
export const roomAudio = new RoomAudio();
