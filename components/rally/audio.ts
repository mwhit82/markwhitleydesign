import type { Mode } from "./data";

export type DriveSound = {
  speed: number;
  throttle: number;
  brake: number;
  sliding: boolean;
  rpm?: number;
  limited?: boolean;
};
export function soundMix(drive: DriveSound, mode: Mode, car: number) {
  const speed = mode === "race" ? Math.abs(drive.speed) : 0;
  const throttle = mode === "race" ? drive.throttle : 0;
  const brake = mode === "race" ? drive.brake : 0;
  const personality = [0.9, 1.04, 0.97, 1.1][car] ?? 1;
  return {
    rate:
      personality *
      Math.min(2.2, drive.rpm !== undefined && mode === "race" ? 0.72 + (drive.rpm - 950) / 4400 : 0.72 + speed * 0.043 + throttle * 0.42 - brake * 0.1),
    idle: (mode==="celebrating"||mode==="finished"?0:0.07) * (1 - Math.min(speed / 9, 1)) * (1 - throttle * 0.85),
    load: mode === "race" ? throttle * (drive.limited ? 0.06 : 0.48) + Math.min(speed / 24, 1) * 0.018 : 0,
    gravel:
      mode === "race"
        ? Math.min(speed / 12, 1) *
          (0.025 + (drive.sliding ? 0.16 : 0) + brake * 0.055)
        : 0,
  };
}

type Layer = { source: AudioBufferSourceNode; gain: GainNode };
const assets = [
  ...Array.from({ length: 4 }, (_, i) => [
    `recorded-car-${i}-idle`,
    `recorded-car-${i}-load`,
  ]).flat(),
  "gravel", "crowd-bed", "crowd-cheer", "crowd-applause",
];

export function crowdLevel(distance:number){return .012+.075*Math.max(0,Math.min(1,(35-distance)/25));}
/** Three small decoded loops run on the audio thread. No media-rate changes, per-frame work, or live synthesis. */
export class RallyAudio {
  private ambience = new Audio("/rally/forest-birds.wav");
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private preload: Promise<Map<string, ArrayBuffer> | null>;
  private decoding: Promise<void> | null = null;
  private layers: Layer[] = [];
  private crowdLoop:Layer|null=null;
  private cheers:Layer[]=[];
  private finishStarted=false;
  private arrivalStarted=false;
  private finishUntil=0;
  private nextCheer=0;
  crowdDistance=Infinity;
  private interval: number | null = null;
  private abort = new AbortController();
  private generation = 0;
  private disposed = false;
  private playing = false;
  private car = 0;
  private mode: Mode = "garage";
  // The render loop only publishes these numbers. Audio work is bounded to 20 Hz.
  drive: DriveSound = { speed: 0, throttle: 0, brake: 0, sliding: false };

  constructor(private onError: () => void) {
    this.ambience.loop = true;
    this.ambience.preload = "auto";
    this.ambience.load();
    this.ambience.addEventListener("error", () => {
      if (this.playing) {
        this.pause();
        this.onError();
      }
    });
    this.preload = this.loadAssets();
  }

  private loadAssets() {
    return Promise.all(
      assets.map(async (name) => {
        try {const response = await fetch(`/rally/${name}.wav`, {
          signal: this.abort.signal,
        });
        if (!response.ok) throw new Error("Audio asset unavailable");
        return [name, await response.arrayBuffer()] as const;}catch(error){if(name.startsWith('crowd-'))return null;throw error;}
      }),
    )
      .then((entries) => new Map(entries.filter((entry):entry is readonly [string,ArrayBuffer]=>entry!==null)))
      .catch(() => null);
  }

  private async decode() {
    const encoded = await this.preload;
    if (!encoded || !this.context)
      throw new Error("Audio samples could not load");
    const context = this.context;
    await Promise.all(
      [...encoded].map(async ([name, data]) => {
        if (this.buffers.has(name)) return;
        try {const buffer = await context.decodeAudioData(data.slice(0));this.buffers.set(name, buffer);}catch(error){if(!name.startsWith("crowd-"))throw error;}
      }),
    );
  }

  async enable() {
    if (this.disposed || this.playing) return;
    const generation = ++this.generation;
    const session = (
      navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    if (session) {
      try {
        session.type = "playback";
      } catch {
        /* Optional API. */
      }
    }
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.context.destination);
    }
    this.decoding ??= this.decode();
    // Both unlock requests happen directly inside the user's tap, before awaiting data.
    const media = this.ambience.play();
    const resumed = this.context.resume();
    let timeout: number | undefined;
    try {
      await Promise.race([
        Promise.all([media, resumed, this.decoding]),
        new Promise<never>((_, reject) => {
          timeout = window.setTimeout(
            () => reject(new Error("Audio loading timed out")),
            8000,
          );
        }),
      ]);
      if (generation !== this.generation || this.disposed) return;
      this.installLayers();
      this.playing = true;
      if(!this.crowdLoop)this.crowdLoop=this.crowdSource("crowd-bed",0,true);
      this.update();
      this.interval = window.setInterval(() => this.update(), 50);
    } catch (error) {
      if (generation === this.generation) {
        this.pause();
        this.decoding = null;
        if (this.buffers.size !== assets.length && !this.disposed)
          this.preload = this.loadAssets();
      }
      throw error;
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
    }
  }

  private installLayers() {
    if (!this.context || !this.master) return;
    const context = this.context;
    for (const layer of this.layers) {
      layer.gain.gain.setTargetAtTime(0, context.currentTime, 0.025);
      layer.source.stop(context.currentTime + 0.12);
      layer.source.onended = () => {
        layer.source.disconnect();
        layer.gain.disconnect();
      };
    }
    this.layers = [
      `recorded-car-${this.car}-idle`,
      `recorded-car-${this.car}-load`,
      "gravel",
    ].map((name) => {
      const source = context.createBufferSource();
      source.buffer = this.buffers.get(name)!;
      source.loop = true;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.master!);
      source.start();
      return { source, gain };
    });
  }

  setEnvironment(stage: string) {
    const next = stage === "forest" || stage === "alpine" ? "/rally/forest-birds.wav" : "/rally/open-wind.wav";
    if (this.ambience.getAttribute("src") === next) return;
    this.ambience.pause();
    this.ambience.src=next;
    this.ambience.load();
    if(this.playing) void this.ambience.play().catch(()=>{this.pause();this.onError();});
  }
  setCar(car: number) {
    this.car = car;
    if (this.playing) this.installLayers();
  }
  private crowdSource(name:string,volume:number,loop=false):Layer|null{
    if(!this.context||!this.master||!this.buffers.has(name))return null;
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers.get(name)!;source.loop=loop;gain.gain.value=volume;source.connect(gain);gain.connect(this.master);source.start();return {source,gain};
  }
  private cheer(name:string,volume:number){
    if(!this.playing)return;
    if(this.cheers.length>=2){const oldest=this.cheers.shift()!;oldest.source.stop();oldest.source.disconnect();oldest.gain.disconnect();}
    const layer=this.crowdSource(name,volume);if(!layer)return;this.cheers.push(layer);
    layer.source.onended=()=>{layer.source.disconnect();layer.gain.disconnect();this.cheers=this.cheers.filter(item=>item!==layer);};
  }
  private clearCheers(){for(const layer of this.cheers){layer.source.stop();layer.source.disconnect();layer.gain.disconnect();}this.cheers=[];}
  setMode(mode: Mode) {
    if(mode===this.mode)return;
    this.mode=mode;
    if(mode==='garage'||mode==='countdown'){
      this.clearCheers();this.finishStarted=false;this.arrivalStarted=false;this.finishUntil=0;this.nextCheer=(this.context?.currentTime??0)+7;
    }
    if(mode==='celebrating'&&!this.finishStarted){this.finishStarted=true;this.finishUntil=(this.context?.currentTime??0)+9;this.cheer('crowd-cheer',.22);}
    if(mode==='finished'&&!this.arrivalStarted){this.arrivalStarted=true;this.finishUntil=(this.context?.currentTime??0)+6;this.cheer('crowd-applause',.22);}
    if(mode==='paused')this.pause();
  }
  private update() {
    if (!this.playing || !this.context || this.layers.length !== 3) return;
    const mix = soundMix(this.drive, this.mode, this.car);
    const time = this.context.currentTime;
    this.layers[0].source.playbackRate.setTargetAtTime(mix.rate, time, 0.09);
    this.layers[1].source.playbackRate.setTargetAtTime(mix.rate, time, 0.09);
    this.layers[0].gain.gain.setTargetAtTime(mix.idle, time, 0.08);
    this.layers[1].gain.gain.setTargetAtTime(mix.load, time, 0.07);
    this.layers[2].gain.gain.setTargetAtTime(mix.gravel, time, 0.1);
    const celebration=this.mode==='celebrating'||this.mode==='finished';
    const crowd=this.mode==='race'?crowdLevel(this.crowdDistance):celebration?.04*Math.max(0,Math.min(1,(this.finishUntil-time)/3)):0;
    this.crowdLoop?.gain.gain.setTargetAtTime(crowd,time,.3);
    if(this.mode==='race'&&this.crowdDistance<25&&time>=this.nextCheer){this.nextCheer=time+7;this.cheer('crowd-cheer',.10);}
    if(celebration)for(const layer of this.cheers)layer.gain.gain.setTargetAtTime(.22*Math.max(0,Math.min(1,(this.finishUntil-time)/2)),time,.3);
  }
  pause() {
    this.generation++;
    this.playing = false;
    if (this.interval !== null) window.clearInterval(this.interval);
    this.interval = null;
    this.ambience.pause();
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
  }
  dispose() {
    this.disposed = true;
    this.pause();
    this.abort.abort();
    for (const layer of this.layers) {
      layer.source.stop();
      layer.source.disconnect();
      layer.gain.disconnect();
    }
    this.layers = [];this.clearCheers();
    if(this.crowdLoop){this.crowdLoop.source.stop();this.crowdLoop.source.disconnect();this.crowdLoop.gain.disconnect();this.crowdLoop=null;}
    void this.context?.close();
    this.ambience.removeAttribute("src");
    this.ambience.load();
  }
}
