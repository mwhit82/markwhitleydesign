/** Tiny pre-rendered arcade sounds. No network requests or synthesis in the game loop. */
export class SoccerAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<"turn" | "cheer", AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private muted = false;

  unlock() {
    try {
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        this.master = context.createGain();
        this.master.gain.value = this.muted ? 0 : .5;
        this.master.connect(context.destination);
        for (const kind of ["turn", "cheer"] as const) {
          const duration = kind === "turn" ? .055 : .65;
          const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
          const data = buffer.getChannelData(0);
          let noise = 0;
          for (let i = 0; i < data.length; i++) {
            const t = i / context.sampleRate, progress = t / duration;
            if (i % 6 === 0) noise = Math.random() * 2 - 1;
            const envelope = Math.min(1, t / .008) * Math.pow(1 - progress, kind === "turn" ? 2 : .7);
            // A soft boot-tap; a noisy, rising stadium cheer with an arcade chord.
            const tone = kind === "turn" ? Math.sin(2 * Math.PI * (180 * t - 700 * t * t)) :
              (Math.sin(2 * Math.PI * 392 * t) + Math.sin(2 * Math.PI * 494 * t) + Math.sin(2 * Math.PI * 587 * t)) / 3;
            data[i] = envelope * (kind === "turn" ? .5 * noise + .25 * tone : .42 * noise * (.7 + .3 * Math.sin(t * 38)) + .18 * tone);
          }
          this.buffers.set(kind, buffer);
        }
      }
      if (this.context.state !== "running") void this.context.resume().catch(() => {});
    } catch { /* Audio is optional; gameplay must remain available. */ }
  }

  play(kind: "turn" | "cheer") {
    if (this.muted || this.context?.state !== "running" || !this.master) return;
    try {
      if (this.voices.size >= 6) return;
      const source = this.context.createBufferSource();
      source.buffer = this.buffers.get(kind) ?? null;
      source.connect(this.master);
      this.voices.add(source);
      source.onended = () => { source.disconnect(); this.voices.delete(source); };
      source.start();
    } catch { /* A suspended audio device must never break the simulation. */ }
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : .5;
    if (muted) this.stop();
  }
  stop() {
    for (const source of this.voices) { try { source.stop(); source.disconnect(); } catch {} }
    this.voices.clear();
  }
  dispose() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.master = null;
    this.buffers.clear();
  }
}
