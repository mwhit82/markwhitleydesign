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
const { RallyAudio, soundMix } = await import(
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
    value: 0,
    setTargetAtTime() {
      automation++;
    },
  });
  class Media {
    loop = false;
    paused = true;
    load() {}
    addEventListener() {}
    removeAttribute() {}
    play() {
      mediaPlays++;
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      mediaPauses++;
      this.paused = true;
    }
    set playbackRate(value) {
      throw new Error("Native media rate must stay unchanged");
    }
  }
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
      return Promise.resolve({});
    }
    resume() {
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
    await audio.enable();
    assert.equal(decodes, 9);
    assert.equal(sources, 3);
    assert.deepEqual(periods, [50]);
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
      5,
      "one fixed-rate update schedules only five parameters",
    );
    audio.setCar(2);
    assert.equal(decodes, 9);
    assert.equal(sources, 6);
    audio.setMode("paused");
    assert.equal(timers.size, 0);
    assert.ok(mediaPauses > 0);
    audio.setMode("race");
    await audio.enable();
    assert.equal(decodes, 9);
    assert.equal(timers.size, 1);
    audio.dispose();
    assert.equal(timers.size, 0);
    assert.equal(closed, 1);
  } finally {
    if (!closed) audio.dispose();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
