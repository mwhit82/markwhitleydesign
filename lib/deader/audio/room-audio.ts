/** Gesture-unlocked synthesis. One context for the game; bounded voices, explicit cleanup. */
export type Cue =
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
  private voices = new Set<AudioScheduledSourceNode>();
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
      kind === "knock" ? 3 : kind === "news" ? 3 : kind === "stutter" ? 2 : 1;
    if (this.voices.size + count > 12) return;
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
        kind === "news"
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
    this.voices.clear();
  }
  diagnostics() {
    return {
      voices: this.voices.size,
      ambientSources: this.bed?.sources.length ?? 0,
      context: this.context?.state ?? "locked",
    };
  }
}
export const roomAudio = new RoomAudio();
