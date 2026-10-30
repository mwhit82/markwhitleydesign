/** Quiet, original synthesised bells and night drones. No downloads required. */
export class ChristmasAudio {
  private context: AudioContext | null = null;
  private bus: GainNode | null = null;
  muted = false;
  async start() {
    try {
      this.context ??= new AudioContext();
      if (!this.bus) { this.bus=this.context.createGain();this.bus.gain.value=.12;this.bus.connect(this.context.destination); }
      await this.context.resume();
    } catch { /* Audio is optional; gameplay remains available. */ }
  }
  tone(frequency:number,duration:number,night=false) {
    const c=this.context;if(!c||!this.bus||c.state!=='running'||this.muted)return;
    const oscillator=c.createOscillator(),gain=c.createGain();
    oscillator.type=night?'sine':'triangle';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(night?.15:.25,c.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);
    oscillator.connect(gain);gain.connect(this.bus);oscillator.start();oscillator.stop(c.currentTime+duration);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  suspend(){void this.context?.suspend();}
  close(){void this.context?.close();this.context=null;this.bus=null;}
}
