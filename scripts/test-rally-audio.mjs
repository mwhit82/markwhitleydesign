import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../components/rally/audio.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { RallyAudio, soundMix, crowdLevel } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("engine follows throttle and speed, lifts off, and responds to braking/sliding", () => {
  const idle = soundMix(
    { speed: 0, throttle: 0, brake: 0, sliding: false },
    "race",
    0,
  );
  const pull = soundMix(
    { speed: 12, throttle: 1, brake: 0, sliding: false },
    "race",
    0,
  );
  const lift = soundMix(
    { speed: 12, throttle: 0, brake: 0, sliding: false },
    "race",
    0,
  );
  const brake = soundMix(
    { speed: 8, throttle: 0, brake: 1, sliding: true },
    "race",
    0,
  );
  assert.ok(pull.rate > idle.rate && pull.load > idle.load);
  assert.ok(lift.rate < pull.rate && lift.load < pull.load);
  assert.ok(brake.rate < lift.rate && brake.gravel > lift.gravel);
  assert.notEqual(
    soundMix({ speed: 10, throttle: 1, brake: 0, sliding: false }, "race", 0)
      .rate,
    soundMix({ speed: 10, throttle: 1, brake: 0, sliding: false }, "race", 3)
      .rate,
  );
  assert.equal(
    soundMix({ speed: 24, throttle: 1, brake: 1, sliding: true }, "garage", 0)
      .gravel,
    0,
  );
});

test("bounded audio graph: no native media rate mutations, cached decoding, pause and disposal", async () => {
  const saved = new Map(
    ["Audio", "AudioContext", "window", "navigator", "fetch"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  let decodes = 0,
    sources = 0,
    automation = 0,
    mediaPlays = 0,
    mediaPauses = 0,
    closed = 0,
    intervalId = 0;
  const timers = new Map();
  const periods = [];
  const param = () => ({
    value: 0, cancelScheduledValues(){},setValueAtTime(){},
    setTargetAtTime() {
      automation++;
    },
  });
  let mediaFailure=null, deferMedia=false;
  const pendingMedia=[];
  class Media {
    constructor(src){this.src=src;}
    getAttribute(name){return name==='src'?this.src:null;}
    loop = false;
    paused = true;
    load() {for(const reject of pendingMedia.splice(0))reject(new DOMException('Source changed','AbortError'));}
    addEventListener() {}
    removeAttribute() {}
    play() {
      mediaPlays++;
      this.paused = false;
      if(mediaFailure)return Promise.reject(mediaFailure);
      if(deferMedia)return new Promise((_,reject)=>pendingMedia.push(reject));
      return Promise.resolve();
    }
    pause() {
      for(const reject of pendingMedia.splice(0))reject(new DOMException('Playback interrupted','AbortError'));
      mediaPauses++;
      this.paused = true;
    }
    set playbackRate(value) {
      throw new Error("Native media rate must stay unchanged");
    }
  }
  let awaitingGesture=false;const pendingResumes=[];
  class Context {
    state = "suspended";
    currentTime = 0;
    destination = {};
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} };
    }
    createBufferSource() {
      sources++;
      return {
        playbackRate: param(),
        connect() {},
        start() {},
        stop() {},
        disconnect() {},
      };
    }
    decodeAudioData() {
      decodes++;
      return Promise.resolve({duration:1});
    }
    resume() {
      if(awaitingGesture)return new Promise(resolve=>pendingResumes.push(resolve));
      for(const resolve of pendingResumes.splice(0))resolve();
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
    close() {
      closed++;
      return Promise.resolve();
    }
  }
  for (const [key, value] of Object.entries({
    Audio: Media,
    AudioContext: Context,
    window: {
      setTimeout,
      clearTimeout,
      setInterval(fn, period) {
        periods.push(period);
        timers.set(++intervalId, fn);
        return intervalId;
      },
      clearInterval(id) {
        timers.delete(id);
      },
    },
    navigator: { audioSession: { type: "auto" } },
    fetch: async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }),
  }))
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  const audio = new RallyAudio(() => {});
  try {
    assert.equal(mediaPlays, 0, "preloading must not autoplay");
    const startup=audio.enable();assert.equal(audio.enable(),startup,"concurrent starts share one promise");await startup;
    assert.equal(decodes, 56);
    assert.equal(sources, 6, "five ongoing sources plus one completed silent warmup");
    assert.deepEqual(periods, [50]);
    audio.context.state='suspended';await audio.enable();assert.equal(audio.context.state,'running','a browser-interrupted context resumes on the next gesture');assert.equal(decodes,56);
    const previous = automation;
    for (let i = 0; i < 600; i++) {
      audio.drive.speed = i % 24;
      audio.drive.throttle = 1;
    }
    assert.equal(
      automation,
      previous,
      "render telemetry must not execute audio work",
    );
    [...timers.values()][0]();
    assert.equal(
      automation - previous,
      8,
      "one fixed-rate update schedules eight parameters",
    );
    audio.setMode("race");audio.speak(["1-left","2-right"]);
    assert.equal(audio.voiceLayers.length,2);
    const voiceSources=sources;audio.speak(["crest"]);assert.equal(sources,voiceSources,"never overlap calls");
    audio.stopVoice();assert.equal(audio.voiceLayers.length,0);
    audio.setCar(2);
    assert.equal(decodes, 56);
    assert.equal(sources, 12);
    audio.setMode("paused");
    assert.equal(timers.size, 0);
    assert.ok(mediaPauses > 0);
    audio.setMode("race");
    await audio.enable();
    assert.equal(decodes, 56);
    assert.equal(timers.size, 1);
    audio.cue('select');const selectedCue=audio.uiLayer;audio.cue('start');assert.notEqual(audio.uiLayer,selectedCue);audio.cue('restart');assert.ok(audio.uiLayer);
    audio.setMode('celebrating');const finishSources=sources;audio.setMode('celebrating');assert.equal(sources,finishSources);
    audio.setMode('finished');assert.equal(sources,finishSources);audio.setMode('finished');assert.equal(sources,finishSources);
    assert.ok(audio.cheers.length<=2);audio.setMode('countdown');assert.equal(audio.cheers.length,0);
    audio.setMode('race');audio.crowdDistance=10;
    for(let i=1;i<8;i++){audio.context.currentTime=i*8;[...timers.values()][0]();assert.ok(audio.cheers.length<=2);}
    audio.setMode('garage');assert.equal(audio.cheers.length,0);
    audio.dispose();
    assert.equal(timers.size, 0);
    assert.equal(closed, 1);
    // Reproduce source swaps while the initial media play promise is pending.
    deferMedia=true;
    let stageErrors=0;
    const switching=new RallyAudio(()=>stageErrors++);
    const initial=switching.enable();switching.setEnvironment('neon');switching.setEnvironment('mountain');
    await initial;
    assert.equal(switching.playing,true,'pending/aborted ambience cannot block engine startup');
    const decoded=decodes;
    for(const failure of [new DOMException('Source changed','AbortError'),new DOMException('Playback denied','NotAllowedError'),new Error('Missing ambience')]){
      mediaFailure=failure;
      for(const stage of ['forest','nyc','mx','mountain'])switching.setEnvironment(stage);
      await Promise.resolve();await Promise.resolve();
      assert.equal(switching.playing,true,'ambience rejection must not pause engines');
      assert.equal(switching.context.state,'running');assert.equal(timers.size,1);
      assert.equal(decodes,decoded,'changing stages reuses decoded engine and voice buffers');
    }
    assert.equal(stageErrors,0,'stage selection must not request global mute');
    switching.pause();const playsBefore=mediaPlays;switching.setEnvironment('neon');assert.equal(mediaPlays,playsBefore,'changing stage while muted must not autoplay');
    switching.dispose();deferMedia=false;mediaFailure=null;
    awaitingGesture=true;
    const gestureAudio=new RallyAudio(()=>assert.fail('a waiting browser unlock must recover on the next tap'));
    const waiting=gestureAudio.enable();
    assert.equal(gestureAudio.context.state,'suspended');
    awaitingGesture=false;
    const tapped=gestureAudio.enable();
    assert.equal(tapped,waiting,'reuse the same startup while reissuing resume');
    await tapped;
    assert.equal(gestureAudio.playing,true);
    assert.equal(gestureAudio.diagnostics.enableCount,1);
    const recoveryDecodes=decodes, recoverySources=sources;
    const playback=[];gestureAudio.onPlayback=active=>playback.push(active);
    gestureAudio.context.state='interrupted';gestureAudio.ambience.pause();
    gestureAudio.context.onstatechange();
    assert.equal(playback[0],false,'interruption is reported separately from mute preference');
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    assert.equal(gestureAudio.context.state,'running');
    assert.equal(gestureAudio.ambience.paused,false,'interrupted media ambience also resumes');
    assert.equal(playback.at(-1),true);
    assert.equal(decodes,recoveryDecodes,'resume does not decode again');
    assert.equal(sources,recoverySources,'resume preserves bounded graph');
    gestureAudio.pause();gestureAudio.context.onstatechange();
    assert.equal(gestureAudio.context.state,'suspended','intentional mute cannot auto-resume');
    await gestureAudio.enable();
    assert.equal(playback.at(-1),true,'explicit restart restores the playback indicator');
    gestureAudio.dispose();
    globalThis.fetch=async url=>({ok:!String(url).includes('crowd-')&&!String(url).includes('voice-'),arrayBuffer:async()=>new ArrayBuffer(8)});
    const fallback=new RallyAudio(()=>assert.fail('optional crowd/voice assets must not stop engine audio'));
    await fallback.enable();assert.equal(fallback.layers.length,4);assert.equal(fallback.crowdLoop,null);fallback.setMode("race");fallback.speak(["1-left"]);assert.equal(fallback.voiceLayers.length,0);fallback.dispose();
  } finally {
    if (!closed) audio.dispose();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('recorded engine mix follows actual RPM and cuts load at the limiter', () => {
  const drive = {speed: 20, throttle: 1, brake: 0, sliding: false, rpm: 3000};
  const low = soundMix(drive, 'race', 0);
  const high = soundMix({...drive, rpm: 7000}, 'race', 0);
  const cut = soundMix({...drive, rpm: 7000, limited: true}, 'race', 0);
  assert.ok(high.rate > low.rate);
  assert.ok(cut.load < high.load);
  assert.equal(cut.rate, high.rate);
});

test('all recorded layers are compact valid PCM WAV assets', async () => {
  for(let car=0;car<7;car++) {
    for(const layer of ['idle','load','lift']) {
      const data = await readFile(new URL(`../public/rally/recorded-car-${car}-${layer}.wav`, import.meta.url));
      assert.equal(data.toString('ascii',0,4), 'RIFF');
      assert.equal(data.toString('ascii',8,12), 'WAVE');
      assert.equal(data.readUInt16LE(20),1);
      assert.equal(data.readUInt16LE(22),1);
      assert.equal(data.readUInt32LE(24),22050);
      assert.ok(data.length < 110000);
      let peak=0, energy=0;
      for(let i=44;i<data.length;i+=2) {
        const sample=data.readInt16LE(i);
        peak=Math.max(peak,Math.abs(sample)); energy+=sample*sample;
      }
      assert.ok(peak<32767 && energy>0);
      assert.ok(Math.abs(data.readInt16LE(44)-data.readInt16LE(data.length-2))<500);
    }
  }
});

test('idle fades away at speed and the unloaded engine stays quiet', () => {
  const drive = {speed: 20, throttle: 0, brake: 0, sliding: false, rpm: 6000};
  const coast = soundMix(drive, 'race', 0);
  const power = soundMix({...drive, throttle: 1}, 'race', 0);
  const garage = soundMix(drive, 'garage', 0);
  assert.equal(coast.idle, 0);
  assert.ok(coast.load < power.load / 10);
  assert.equal(garage.load, 0);
  assert.ok(garage.idle <= .07);
});

test('crowd falloff stays subtle far away and rises near spectators',()=>{
 assert.equal(crowdLevel(100),crowdLevel(35));assert.ok(crowdLevel(10)>crowdLevel(25));
 assert.equal(crowdLevel(0),crowdLevel(10));assert.ok(crowdLevel(10)<.1);
 assert.equal(soundMix({speed:0,throttle:0,brake:0,sliding:false},'finished',0).idle,0);
});
test('crowd assets are bounded mono PCM recordings',async()=>{
 for(const name of ['crowd-bed','crowd-cheer','crowd-applause','ui-select','ui-start','ui-restart','kart-tyres']){
  const data=await readFile(new URL(`../public/rally/${name}.wav`,import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.readUInt16LE(22),1);assert.equal(data.readUInt32LE(24),22050);assert.ok(data.length<550000);
 }
});

 test('kart engine stays in a warm pitch range and tyre squeal follows cornering',()=>{
 const d={speed:18,throttle:1,brake:0,sliding:false,rpm:7000,corner:0};
 const straight=soundMix(d,'race',4),turn=soundMix({...d,corner:.8},'race',4);
 assert.equal(straight.tyre,0);assert.ok(turn.tyre>0&&turn.tyre<.15);
 assert.ok(straight.rate>1.8&&straight.rate<2);assert.ok(soundMix({...d,rpm:950},'race',4).rate<straight.rate);
 assert.equal(soundMix({...d,corner:1,sliding:true},'paused',4).tyre,0);
 assert.equal(soundMix({...d,speed:0,corner:1,sliding:true},'race',4).tyre,0);
 assert.equal(soundMix({...d,corner:1},'race',0).tyre,0);
 });
