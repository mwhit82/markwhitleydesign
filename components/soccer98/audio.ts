type Cue = "turn" | "cheer";
const files: Record<Cue, string> = { turn: "/soccer98/audio/kick-v2.wav", cheer: "/soccer98/audio/stadium-roar-v3.wav" };
/** Recorded CC0 clips, fetched early and decoded once outside the movement loop. */
export class SoccerAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<Cue, AudioBuffer>();
  private voices = new Map<Cue, { source: AudioBufferSourceNode; gain: GainNode }>();
  private muted = false;
  private disposed = false;
  private decoding: Promise<void> | null = null;
  private abort = new AbortController();
  private preload = Promise.all((Object.keys(files) as Cue[]).map(async kind => {
    try {
      const response = await fetch(files[kind], { signal: this.abort.signal });
      if (!response.ok) return null;
      return { kind, bytes: await response.arrayBuffer() };
    } catch { return null; }
  }));

  unlock() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : .8;
        this.master.connect(this.context.destination);
      }
      const context = this.context;
      // Resume synchronously from the user's gesture; don't wait for network/decode.
      if (context.state !== "running") void context.resume().catch(() => {});
      if (!this.decoding) this.decoding = this.preload.then(async clips => {
        await Promise.all(clips.map(async clip => {
          if (!clip || this.disposed) return;
          try {
            const buffer = await context.decodeAudioData(clip.bytes);
            if (!this.disposed) this.buffers.set(clip.kind, buffer);
          } catch { /* One missing clip must not disable the other. */ }
        }));
      }).catch(() => {});
    } catch { /* Audio is optional; gameplay remains available. */ }
  }

  private stopVoice(kind: Cue) {
    const voice = this.voices.get(kind);
    if (!voice) return;
    try { voice.source.stop(); } catch {}
    voice.source.disconnect(); voice.gain.disconnect();
    this.voices.delete(kind);
  }
  play(kind: Cue) {
    const buffer = this.buffers.get(kind);
    if (!buffer || this.muted || this.disposed || this.context?.state !== "running" || !this.master) return;
    try {
      // At most one kick and one cheer; each pickup gets a fresh cheer.
      this.stopVoice(kind);
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = kind === "cheer" ? 1 : this.voices.has("cheer") ? .25 : .55;
      if (kind === "cheer") {
        const kick = this.voices.get("turn");
        if (kick) kick.gain.gain.value = .25;
      }
      source.connect(gain); gain.connect(this.master);
      this.voices.set(kind, { source, gain });
      source.onended = () => {
        source.disconnect(); gain.disconnect();
        if (this.voices.get(kind)?.source === source) this.voices.delete(kind);
      };
      source.start();
    } catch { /* Device interruptions must never break the simulation. */ }
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : .8;
    if (muted) this.stop();
  }
  stop() { for (const kind of this.voices.keys()) this.stopVoice(kind); }
  dispose() {
    this.disposed = true; this.abort.abort(); this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.master = null; this.buffers.clear();
  }
}
