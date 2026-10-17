import test from "node:test";
import assert from "node:assert/strict";
import { moduleUrl } from "./rally-test-loader.mjs";
import { resolve } from "node:path";
const g = await import(await moduleUrl(resolve("lib/deader/game.ts")));
test("starter balance persists and purchases are atomic", () => {
  const s = g.newSave();
  assert.equal(s.coins, 150);
  const bought = g.purchase(s, "green");
  assert.equal(bought.coins, 100);
  assert.equal(g.purchase(bought, "green"), bought);
  assert.equal(g.purchase(bought, "black"), bought);
  assert.equal(g.equip(s, "pink"), s);
  const worn = g.equip(bought, "green");
  assert.deepEqual(g.readSave(JSON.stringify(worn)), worn);
  assert.equal(g.readSave(JSON.stringify(g.purchase(s, "black"))).coins, 0);
});
test("malformed and incomplete saves are sanitised", () => {
  assert.deepEqual(g.readSave("{broken"), g.newSave());
  const s = g.readSave(
    JSON.stringify({
      version: 1,
      coins: -5,
      owned: ["green", "fake", "green"],
      equipped: "pink",
    }),
  );
  assert.equal(s.coins, 0);
  assert.deepEqual(s.owned, ["yellow", "green"]);
  assert.equal(s.equipped, "yellow");
  assert.deepEqual(g.readSave("null"), g.newSave());
});
test("reward claims cannot repeat and progression is monotonic", () => {
  const s = g.reward(g.newSave(), "night:run-1", 25, 1, 20);
  assert.equal(s.coins, 175);
  assert.equal(s.completedNights, 1);
  assert.equal(g.reward(s, "night:run-1", 25), s);
  assert.equal(g.reward(s, "invalid", -50), s);
});
test("movement normalises diagonals, clamps frame gaps and slides along obstacles", () => {
  const p = { x: 0, z: 0 };
  const a = g.move(p, 1, 0, 0.02, 5, []),
    b = g.move(p, 1, 1, 0.02, 5, []);
  assert.ok(Math.abs(Math.hypot(b.x, b.z) - a.x) < 1e-9);
  assert.deepEqual(g.move(p, 1, 0, 10, 5, []), g.move(p, 1, 0, 0.05, 5, []));
  assert.deepEqual(g.move({ x: 4.7, z: 0 }, 1, 0, 0.05, 5, []), {
    x: 4.7,
    z: 0,
  });
  const blocked = g.move({ x: 0, z: 0 }, 1, 1, 0.05, 5, [
    { x: 0.5, z: 0, hx: 0.2, hz: 0.1 },
  ]);
  assert.equal(blocked.x, 0);
  assert.ok(blocked.z > 0);
});
test("clock endpoints, trust and session settings", () => {
  assert.equal(g.clockLabel(0), "12:00 AM");
  assert.equal(g.clockLabel(600), "5:55 AM");
  assert.equal(g.clockLabel(800), "5:55 AM");
  assert.equal(g.NIGHT.trust, 3);
  assert.deepEqual(g.createSession("hard", "infinite"), {
    difficulty: "hard",
    mode: "infinite",
    night: 1,
  });
});
test("store handles unavailable storage and preserves starter grant after reload", async () => {
  const { useGame, SAVE_KEY } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  useGame.setState({ ready: false });
  useGame.getState().hydrate();
  useGame.getState().buy("pink");
  useGame.getState().wear("pink");
  assert.equal(JSON.parse(memory.get(SAVE_KEY)).coins, 75);
  useGame.setState({ ready: false });
  useGame.getState().hydrate();
  assert.equal(useGame.getState().save.coins, 75);
  assert.equal(useGame.getState().save.equipped, "pink");
  globalThis.localStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  useGame.setState({ ready: false });
  useGame.getState().hydrate();
  assert.equal(useGame.getState().storageFailed, true);
  assert.equal(useGame.getState().ready, true);
  useGame.setState({ difficulty: "hard", mode: "infinite" });
  useGame.getState().start();
  assert.deepEqual(useGame.getState().session, {
    difficulty: "hard",
    mode: "infinite",
    night: 1,
  });
});

test("solo room has no invisible multiplayer blockers and CCTV stays collidable", () => {
  for (const p of [
    { x: -2.5, z: -1.6 },
    { x: 0.7, z: -1.5 },
  ]) {
    const next = g.move(p, 1, 0, 0.05, 3.8, g.ROOM_OBSTACLES);
    assert.ok(next.x > p.x);
  }
  const p = { x: g.ROOM_CCTV.x + 1.1, z: g.ROOM_CCTV.z };
  assert.equal(g.move(p, -1, 0, 0.05, 3.8, g.ROOM_OBSTACLES).x, p.x);
});

const room = await import(await moduleUrl(resolve("lib/deader/room.ts")));
test("door guards transitions, lock and duplicate visitor resolution", () => {
  const initial = { ...room.freshRoom(), view: "explore" };
  const locked = room.transitionDoor(initial, { type: "lock" });
  assert.equal(locked.door, "LOCKED");
  assert.equal(room.transitionDoor(locked, { type: "open-confirmed" }), locked);
  let s = room.transitionDoor(locked, { type: "unlock" });
  s = room.transitionDoor(s, { type: "arrival", id: "visitor-1" });
  assert.equal(s.door, "VISITOR_WAITING");
  assert.equal(room.transitionDoor(s, { type: "arrival", id: "visitor-2" }), s);
  s = room.transitionDoor(s, { type: "inspect" });
  assert.equal(s.view, "inspect");
  s = room.transitionDoor(s, { type: "leave-inspection" });
  assert.equal(s.door, "VISITOR_WAITING");
  s = room.transitionDoor(s, { type: "open-confirmed" });
  assert.deepEqual(s.resolved, ["visitor-1"]);
  assert.equal(s.visitorId, null);
  assert.equal(room.transitionDoor(s, { type: "reject" }), s);
  assert.equal(room.transitionDoor(s, { type: "close" }), s);
  s = room.transitionDoor(s, { type: "opened" });
  s = room.transitionDoor(s, { type: "close" });
  s = room.transitionDoor(s, { type: "closed" });
  assert.equal(s.door, "CLOSED");
  assert.equal(room.transitionDoor(s, { type: "arrival", id: "visitor-1" }), s);
  s = room.transitionDoor(s, { type: "arrival", id: "visitor-2" });
  s = room.transitionDoor(s, { type: "reject" });
  assert.equal(s.door, "CLOSED");
  assert.deepEqual(s.resolved, ["visitor-1", "visitor-2"]);
  assert.equal(room.transitionDoor(s, { type: "reject" }), s);
});
test("empty inspection, locked door and completed animation guards", () => {
  let s = room.transitionDoor(room.freshRoom(), { type: "inspect" });
  assert.equal(s.visitorId, null);
  s = room.transitionDoor(s, { type: "leave-inspection" });
  assert.equal(s.door, "CLOSED");
  assert.equal(room.transitionDoor(s, { type: "opened" }), s);
  assert.equal(room.transitionDoor(s, { type: "reject" }), s);
});
test("broadcast timing respects pauses, suspension gaps and caption boundaries", () => {
  const b = room.NIGHT_ONE_NEWS;
  assert.equal(room.broadcastDuration(b), 40);
  assert.equal(room.broadcastSegment(b, 0), b.segments[0]);
  assert.equal(room.broadcastSegment(b, 6), b.segments[1]);
  assert.equal(room.broadcastSegment(b, 100), b.segments.at(-1));
  assert.equal(room.advanceBroadcast(5, 10, true, b), 5);
  assert.equal(room.advanceBroadcast(5, 10, false, b), 5.25);
  assert.equal(room.advanceBroadcast(39.9, 0.2, false, b), 40);
  assert.equal(room.advanceBroadcast(5, NaN, false, b), 5);
});
test("v1 saves gain viewed reports without losing currency, cosmetics or rewards", () => {
  const legacy = {
    ...g.purchase(g.newSave(), "pink"),
    claimedRewards: ["previous-night"],
  };
  delete legacy.viewedBroadcasts;
  const migrated = g.readSave(JSON.stringify(legacy));
  assert.equal(migrated.coins, 75);
  assert.deepEqual(migrated.owned, ["yellow", "pink"]);
  assert.deepEqual(migrated.claimedRewards, ["previous-night"]);
  assert.deepEqual(migrated.viewedBroadcasts, []);
  assert.deepEqual(
    g.readSave(
      JSON.stringify({
        ...legacy,
        viewedBroadcasts: ["night-1-intro", 9, "night-1-intro"],
      }),
    ).viewedBroadcasts,
    ["night-1-intro"],
  );
});
test("doorway stays inside room collision bounds even when door opens", () => {
  let p = { x: 0.25, z: -3.45 };
  for (let i = 0; i < 100; i++)
    p = g.move(p, 0, -1, 0.05, 3.8, g.ROOM_OBSTACLES);
  assert.ok(p.z >= -3.5);
});
test("room store coordinates inspection, pause, viewed broadcasts and fresh sessions", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  globalThis.document = { pointerLockElement: null };
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  useGame.getState().start();
  assert.equal(useGame.getState().room.view, "explore");
  useGame.getState().finishNews();
  assert.deepEqual(useGame.getState().save.viewedBroadcasts, ["night-1-intro"]);
  useGame.getState().roomView("door");
  useGame.getState().doorEvent({ type: "inspect" });
  assert.equal(useGame.getState().room.door, "INSPECTING");
  useGame.getState().escape();
  assert.equal(useGame.getState().room.view, "explore");
  assert.equal(useGame.getState().room.door, "CLOSED");
  useGame.getState().escape();
  assert.equal(useGame.getState().panel, "pause");
  useGame.getState().escape();
  assert.equal(useGame.getState().panel, null);
  useGame.getState().lobby();
  useGame.getState().start();
  assert.deepEqual(
    useGame.getState().room,
    room.freshRoom(
      useGame.getState().room.encounters.runId,
      300,
      useGame.getState().session,
    ),
  );
  assert.deepEqual(useGame.getState().save.viewedBroadcasts, ["night-1-intro"]);
});
test("closed door has a physical collision surface before the room boundary", () => {
  const p = { x: 0.25, z: -3.12 };
  const blocked = g.move(p, 0, -1, 0.05, 3.8, g.ROOM_CLOSED_OBSTACLES);
  assert.equal(blocked.z, p.z);
  assert.ok(g.move(p, 0, -1, 0.05, 3.8, g.ROOM_OBSTACLES).z < p.z);
});

const visitors = await import(
  await moduleUrl(resolve("lib/deader/visitors.ts"))
);
function waiting(visitor = "bea") {
  return {
    ...visitors.freshEncounters("test-run"),
    active: {
      id: "test-run:1",
      visitor,
      phase: "waiting",
      elapsed: 0,
      asked: [],
      decision: null,
    },
  };
}
test("visitor outcome matrix applies exactly one reward or penalty", () => {
  for (const visitor of ["bea", "three"])
    for (const decision of ["admit", "reject"]) {
      const before = waiting(visitor),
        after = visitors.resolveEncounter(before, "test-run:1", decision);
      const correct = (visitor === "bea") === (decision === "admit");
      assert.equal(after.result.correct, correct);
      assert.equal(after.trust, correct ? 3 : 2);
      assert.equal(after.earned, correct ? 5 : 0);
      assert.equal(after.active.phase, "departing");
      assert.equal(
        visitors.resolveEncounter(after, "test-run:1", decision),
        after,
      );
      assert.equal(
        visitors.resolveEncounter(before, "stale", decision),
        before,
      );
    }
  let zero = { ...waiting("three"), trust: 0 };
  assert.equal(visitors.resolveEncounter(zero, "test-run:1", "admit").trust, 0);
});
test("scheduler teaches first encounters, freezes safely, never overlaps, and recovers departures", () => {
  let s = visitors.freshEncounters("run");
  assert.equal(visitors.tickEncounters(s, 100, "easy", true, true), s);
  assert.equal(visitors.tickEncounters(s, 100, "easy", false, false), s);
  assert.equal(
    visitors.tickEncounters(s, 100, "easy", false, true).nextIn,
    11.75,
  );
  const order = [];
  for (let encounter = 0; encounter < 4; encounter++) {
    while (!s.active) s = visitors.tickEncounters(s, 0.25, "easy", false, true);
    order.push(s.active.visitor);
    for (let i = 0; i < 100; i++)
      s = visitors.tickEncounters(s, 0.25, "easy", false, true);
    assert.equal(s.active.phase, "waiting");
    const id = s.active.id;
    const same = visitors.tickEncounters(s, 100, "easy", false, true);
    assert.equal(same.active.elapsed, s.active.elapsed + 0.25);
    s = visitors.resolveEncounter(
      s,
      id,
      visitors.visitorById(s.active.visitor).kind === "human"
        ? "admit"
        : "reject",
    );
    for (let i = 0; i < 16; i++)
      s = visitors.tickEncounters(s, 0.25, "easy", false, true);
    assert.equal(s.active, null);
  }
  assert.deepEqual(order, ["bea", "three", "pippa", "echo"]);
  assert.equal(s.earned, 20);
  assert.equal(new Set(s.resolved).size, 4);
  assert.equal(
    visitors.tickEncounters({ ...s, trust: 0 }, 0.25, "easy", false, true)
      .active,
    null,
  );
});
test("every Anomaly has discoverable evidence and humans have consistent ordinary profiles", () => {
  for (const v of visitors.VISITORS) {
    assert.equal(Object.keys(v.dialogue).length, 3);
    if (v.kind === "human") {
      assert.equal(v.appearance, "ordinary");
      assert.equal(v.movement, "natural");
      assert.equal(v.clues.length, 0);
    } else assert.ok(v.clues.length > 0);
  }
  const sources = new Set(
    visitors.VISITORS.flatMap((v) => v.clues.map((c) => c.source)),
  );
  assert.deepEqual([...sources].sort(), ["cctv", "dialogue", "visual"]);
  const s = waiting("echo"),
    asked = visitors.askQuestion(s, s.active.id, "identity");
  assert.deepEqual(asked.active.asked, ["identity"]);
  assert.equal(visitors.askQuestion(asked, s.active.id, "identity"), asked);
  assert.equal(visitors.askQuestion(s, "wrong", "identity"), s);
});
test("approach progress stays bounded with visible stop-start plateaus", () => {
  const e = { ...waiting("three").active, phase: "approaching", elapsed: 2 };
  assert.equal(
    visitors.approachProgress(e),
    visitors.approachProgress({ ...e, elapsed: 2.5 }),
  );
  assert.equal(visitors.approachProgress({ ...e, elapsed: 22 }), 1);
});
test("arrival during peephole inspection stays inspectable", () => {
  const r = room.transitionDoor(room.freshRoom(), { type: "inspect" });
  const arrived = room.transitionDoor(r, { type: "arrival", id: "late" });
  assert.equal(arrived.visitorId, "late");
  assert.equal(arrived.door, "INSPECTING");
  assert.equal(
    room.transitionDoor(arrived, { type: "leave-inspection" }).door,
    "VISITOR_WAITING",
  );
});
test("store rewards persist once, rejects stale decisions and holds departure for the door", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  globalThis.document = { pointerLockElement: null };
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  useGame.setState({
    save: g.newSave(),
    focused: true,
    panel: null,
    scene: "room",
    room: {
      ...room.freshRoom("test-run", 300),
      view: "door",
      door: "VISITOR_WAITING",
      visitorId: "test-run:1",
      encounters: waiting(),
    },
  });
  useGame.getState().decideVisitor("test-run:1", "admit");
  assert.equal(useGame.getState().save.coins, 155);
  useGame.getState().decideVisitor("test-run:1", "admit");
  assert.equal(useGame.getState().save.coins, 155);
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.encounters.active.elapsed, 0);
  useGame.getState().doorEvent({ type: "opened" });
  for (let i = 0; i < 16; i++) useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.door, "CLOSING");
  assert.equal(useGame.getState().room.encounters.active, null);
  useGame.getState().start();
  assert.equal(useGame.getState().save.coins, 155);
  assert.equal(useGame.getState().room.encounters.trust, 3);
});
test("CCTV allows arrivals while manual pause freezes the shared scheduler", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  useGame.setState({
    scene: "room",
    focused: true,
    panel: null,
    room: { ...room.freshRoom("scheduler-check"), view: "cctv" },
  });
  for (let i = 0; i < 130; i++) useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.encounters.active.phase, "waiting");
  assert.equal(useGame.getState().room.door, "VISITOR_WAITING");
  useGame.getState().start();
  useGame.setState({ panel: "pause" });
  const before = useGame.getState().room;
  useGame.getState().tickVisitors(100);
  assert.equal(useGame.getState().room, before);
  useGame.setState({ panel: null });
  useGame.getState().tickVisitors(100);
  assert.equal(useGame.getState().room.encounters, before.encounters); // News blocks arrivals, but counts toward the night.
  assert.equal(useGame.getState().room.night.elapsed, 0.5);
});

const survival = await import(
  await moduleUrl(resolve("lib/deader/survival.ts"))
);
test("survival sequence guards pause and frame gaps but leaves defeat for dawn", () => {
  let s = survival.beginSurvival("one", true);
  assert.equal(survival.tickSurvival(s, 1, 2, false, false), s);
  assert.equal(survival.tickSurvival(s, 1, 2, true, true), s);
  assert.equal(survival.tickSurvival(s, NaN, 2, false, true), s);
  assert.equal(survival.tickSurvival(s, 99, 2, false, true).elapsed, 0.25);
  const phases = new Set();
  for (let i = 0; i < 60; i++) {
    phases.add(s.phase);
    s = survival.tickSurvival(s, 0.25, 0, false, true);
  }
  assert.deepEqual(
    [...phases],
    ["tension", "lunge", "recovery", "idle"],
  );
  assert.equal(survival.tickSurvival(s, 0.25, 0, false, true), s);
  s = survival.beginSurvival("two", false);
  const humanPhases = new Set();
  for (let i = 0; i < 30; i++) {
    humanPhases.add(s.phase);
    s = survival.tickSurvival(s, 0.25, 1, false, false);
  }
  assert.deepEqual([...humanPhases], ["tension", "recovery", "idle"]);
});
test("settings migrate additively, validate values, and preserve purchased items/rewards", () => {
  const original = g.reward(g.purchase(g.newSave(), "green"), "kept", 5);
  const legacy = { ...original };
  delete legacy.settings;
  const migrated = g.readSave(JSON.stringify(legacy));
  assert.deepEqual(migrated, original);
  const bad = g.readSave(
    JSON.stringify({
      ...original,
      settings: { volume: 9, muted: "yes", quality: "ultra" },
    }),
  );
  assert.equal(bad.settings.volume, 1);
  assert.equal(bad.settings.muted, false);
  assert.equal(bad.settings.quality, "standard");
  assert.deepEqual(survival.readSettings(null), survival.defaultSettings());
  assert.equal(survival.readSettings({ volume: NaN }).volume, 0.6);
  assert.deepEqual([3, 2, 1, 0].map(survival.donutMood), [
    "calm",
    "watchful",
    "agitated",
    "furious",
  ]);
});
test("wrong decisions count once and recover even with no trust remaining", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  globalThis.document = { pointerLockElement: null };
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  const save = g.purchase(g.newSave(), "green");
  for (const [visitor, decision] of [
    ["three", "admit"],
    ["bea", "reject"],
  ]) {
    useGame.setState({
      save,
      focused: true,
      panel: null,
      scene: "room",
      room: {
        ...room.freshRoom("survival-test"),
        view: "door",
        door: "VISITOR_WAITING",
        visitorId: "test-run:1",
        encounters: { ...waiting(visitor), trust: 1 },
      },
    });
    useGame.getState().decideVisitor("test-run:1", decision);
    assert.equal(useGame.getState().room.encounters.trust, 0);
    useGame.getState().decideVisitor("test-run:1", decision);
    useGame.getState().roomView("cctv");
    assert.equal(useGame.getState().room.view, "cctv");
    const frozen = useGame.getState().room;
    useGame.setState({ panel: "pause" });
    useGame.getState().tickVisitors(0.25);
    assert.equal(useGame.getState().room, frozen);
    useGame.setState({ panel: null, focused: false });
    useGame.getState().tickVisitors(0.25);
    assert.equal(useGame.getState().room, frozen);
    useGame.setState({ focused: true });
    if (decision === "admit") useGame.getState().doorEvent({ type: "opened" });
    for (let i = 0; i < 20; i++) useGame.getState().tickVisitors(0.25);
    assert.equal(useGame.getState().room.survival.phase, "idle");
    assert.equal(useGame.getState().room.encounters.mistakes, 1);
    assert.equal(useGame.getState().room.encounters.active, null);
    assert.deepEqual(useGame.getState().save, save);
    useGame.getState().start();
    assert.equal(useGame.getState().room.survival.phase, "idle");
    assert.equal(useGame.getState().room.encounters.trust, 3);
    assert.deepEqual(useGame.getState().save, save);
  }
  useGame.getState().settings({ muted: true, quality: "low" });
  assert.equal(g.readSave(memory.values().next().value).settings.muted, true);
  useGame.getState().lobby();
  assert.equal(useGame.getState().room.survival.phase, "idle");
});

test("ordinary departure restores arrival spacing and lobby cancels every consequence phase", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  globalThis.document = { pointerLockElement: null };
  useGame.setState({
    focused: true,
    panel: null,
    scene: "room",
    session: g.createSession("hard", "normal"),
    room: {
      ...room.freshRoom(),
      view: "door",
      door: "VISITOR_WAITING",
      visitorId: "test-run:1",
      encounters: waiting("bea"),
    },
  });
  useGame.getState().decideVisitor("test-run:1", "reject");
  for (let i = 0; i < 16; i++) useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.survival.phase, "idle");
  assert.equal(useGame.getState().room.encounters.trust, 2);
  assert.equal(useGame.getState().room.encounters.active, null);
  assert.equal(useGame.getState().room.encounters.nextIn, 12);
  const saved = useGame.getState().save;
  for (const phase of [
    "tension",
    "lunge",
    "recovery",
    "donut",
    "blackout",
    "gameover",
  ]) {
    useGame.setState({
      scene: "room",
      room: {
        ...room.freshRoom(),
        survival: { ...survival.beginSurvival("cancel", true), phase },
      },
    });
    useGame.getState().lobby();
    useGame.getState().tickVisitors(0.25);
    assert.equal(useGame.getState().scene, "lobby");
    assert.equal(useGame.getState().room.survival.phase, "idle");
    assert.equal(useGame.getState().save, saved);
  }
});

const nightLogic = await import(
  await moduleUrl(resolve("lib/deader/night.ts"))
);
test("active night clock is bounded, pauses without catch-up and maps exactly to dawn", () => {
  const n = nightLogic.freshNight();
  assert.equal(nightLogic.advanceNight(n, 10, true, 3), n);
  assert.equal(nightLogic.advanceNight(n, NaN, false, 3), n);
  assert.equal(nightLogic.advanceNight(n, -1, false, 3), n);
  assert.equal(nightLogic.advanceNight(n, 99, false, 3).elapsed, 0.5);
  let fast = nightLogic.freshNight(60);
  for (let i = 0; i < 240; i++)
    fast = nightLogic.advanceNight(fast, 0.25, false, 3);
  assert.equal(fast.status, "judging");
  assert.equal(g.clockLabel(fast.elapsed), "5:55 AM");
  assert.equal(nightLogic.advanceNight(fast, 0.25, false, 3), fast);
  assert.equal(
    nightLogic.advanceNight({ ...n, elapsed: 599.9 }, 0.25, false, 0).status,
    "judging",
  );
});
test("shuffled bags cover every visitor and avoid repeats across boundaries", () => {
  const e=visitors.freshEncounters("schedule"),n=nightLogic.freshNight();
  assert.equal(nightLogic.scheduledVisitor({...n,elapsed:11.9},e),null);
  const ids=Array.from({length:90},(_,i)=>nightLogic.shuffledVisitor(e.runId,i));
  for(let i=0;i<90;i+=9)assert.equal(new Set(ids.slice(i,i+9)).size,9);
  for(let i=1;i<ids.length;i++)assert.notEqual(ids[i],ids[i-1]);
  assert.deepEqual(ids,Array.from({length:90},(_,i)=>nightLogic.shuffledVisitor(e.runId,i)));
  assert.notDeepEqual(ids,Array.from({length:90},(_,i)=>nightLogic.shuffledVisitor("different-run",i)));
  assert.equal(nightLogic.scheduledVisitor({...n,elapsed:12},e),ids[0]);
  assert.equal(nightLogic.scheduledVisitor({...n,elapsed:100},{...e,active:waiting().active}),null);
  assert.equal(nightLogic.scheduledVisitor({...n,elapsed:570},e),null);
});

test("full five-minute run resolves ten visitors and rewards only after judgement", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  globalThis.document = { pointerLockElement: null };
  useGame.setState({
    save: g.newSave(),
    focused: true,
    panel: null,
    difficulty: "easy",
    mode: "normal",
    runSeconds: 300,
  });
  useGame.getState().start();
  for (let i = 0; i < 1224; i++) {
    let s = useGame.getState();
    if (s.room.door === "OPENING") s.doorEvent({ type: "opened" });
    if (s.room.door === "CLOSING") s.doorEvent({ type: "closed" });
    const e = s.room.encounters.active;
    if (e?.phase === "waiting") {
      s.roomView("door");
      useGame
        .getState()
        .decideVisitor(
          e.id,
          visitors.visitorById(e.visitor).kind === "human" ? "admit" : "reject",
        );
    }
    useGame.getState().tickVisitors(0.25);
  }
  const s = useGame.getState();
  assert.equal(s.room.night.status, "completed");
  assert.equal(s.room.encounters.correct, 10);
  assert.equal(s.room.encounters.trust, 3);
  assert.equal(s.save.coins, 250);
  assert.equal(s.save.completedNights, 1);
  assert.deepEqual(g.readSave(memory.values().next().value), s.save);
  s.tickVisitors(10);
  s.finishNews();
  s.roomView("door");
  s.decideVisitor("late", "admit");
  assert.equal(useGame.getState().room, s.room);
  assert.equal(useGame.getState().save, s.save);
  assert.equal(
    nightLogic.completeNightReward(
      s.save,
      s.room.night,
      s.room.encounters.runId,
    ),
    s.save,
  );
  s.start();
  assert.equal(useGame.getState().room.night.elapsed, 0);
  assert.equal(useGame.getState().save.coins, 250);
  assert.notEqual(
    useGame.getState().room.encounters.runId,
    s.room.encounters.runId,
  );
});
test("dawn safely cancels inspection, waiting and departure; rehearsal never saves rewards", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  for (const view of ["inspect", "cctv", "door"]) {
    useGame.setState({
      scene: "room",
      focused: true,
      panel: null,
      save: g.newSave(),
      room: {
        ...room.freshRoom("dawn-" + view, 300),
        view,
        night: {
          ...nightLogic.freshNight(),
          elapsed: 599.9,
          introFinished: true,
        },
        door: "INSPECTING",
        visitorId: "test-run:1",
        encounters: waiting(),
      },
    });
    useGame.getState().tickVisitors(0.25);
    assert.equal(useGame.getState().room.night.status, "judging");
    assert.equal(useGame.getState().save.coins,150);
    for(let i=0;i<24;i++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.night.status,"completed");
    assert.equal(useGame.getState().room.encounters.active, null);
    assert.equal(useGame.getState().room.visitorId, null);
    assert.equal(useGame.getState().room.encounters.trust, 3);
    assert.equal(useGame.getState().save.coins, 200);
  }
  useGame.setState({
    save: g.newSave(),
    room: {
      ...room.freshRoom("rehearsal", 60),
      view: "door",
      door: "VISITOR_WAITING",
      visitorId: "test-run:1",
      encounters: waiting(),
    },
  });
  useGame.getState().decideVisitor("test-run:1", "admit");
  assert.equal(useGame.getState().save.coins, 150);
  useGame.setState({
    room: {
      ...useGame.getState().room,
      night: { ...nightLogic.freshNight(60), elapsed: 599 },
    },
  });
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.night.status, "judging");
  for(let i=0;i<24;i++)useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().save.coins, 150);
  assert.equal(useGame.getState().save.completedNights, 0);
});
test("clock keeps running through scares and waits until dawn to judge mistakes", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  useGame.setState({
    scene: "room",
    focused: true,
    panel: null,
    room: room.freshRoom("clock", 300),
  });
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.night.elapsed, 0.5);
  assert.equal(useGame.getState().room.newsSeconds, 0.25);
  useGame.getState().finishNews();
  useGame.getState().roomView("news");
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.view, "explore");
  assert.equal(useGame.getState().room.night.elapsed, 1);
  useGame.getState().finishNews();
  for (const patch of [{ panel: "pause" }, { focused: false }]) {
    useGame.setState(patch);
    const before = useGame.getState().room;
    useGame.getState().tickVisitors(300);
    assert.equal(useGame.getState().room, before);
    useGame.setState({ panel: null, focused: true });
  }
  useGame.setState({
    room: {
      ...useGame.getState().room,
      survival: survival.beginSurvival("last", false),
      encounters: { ...visitors.freshEncounters(), trust: 0, mistakes:3 },
      night: { ...nightLogic.freshNight(), elapsed: 599.9 },
    },
  });
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.night.status, "judging");
  assert.equal(useGame.getState().room.night.elapsed, 600);
  for (let i = 0; i < 30; i++) useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room.survival.phase, "gameover");
});

const progression = await import(
  await moduleUrl(resolve("lib/deader/progression.ts"))
);
test("Phase 6 save additions validate without losing legacy progress or cosmetics", () => {
  const old = {
    ...g.purchase(g.newSave(), "green"),
    completedNights: 1,
    infiniteBest: 8,
  };
  delete old.completions;
  delete old.infiniteRecords;
  delete old.endingViewed;
  const s = g.readSave(JSON.stringify(old));
  assert.equal(s.coins, 100);
  assert.deepEqual(s.owned, ["yellow", "green"]);
  assert.equal(progression.unlockedNight(s), 2);
  assert.equal(s.infiniteBest, 8);
  assert.equal(s.endingViewed, false);
  const invalid = g.readSave(
    JSON.stringify({
      ...s,
      completions: { easy: 99, hard: -1 },
      infiniteRecords: { streak: "9", night: -2 },
      endingViewed: "yes",
    }),
  );
  assert.deepEqual(invalid.completions.easy, []);
  assert.deepEqual(invalid.completions.hard, []);
  assert.equal(invalid.infiniteRecords.streak, 0);
  assert.equal(invalid.endingViewed, false);
});
test("all story schedules remain bounded and every later visitor has fair evidence", () => {
  for (const difficulty of ["easy", "medium", "hard"])
    for (let number = 1; number <= 3; number++) {
      const n = nightLogic.freshNight(300, {
        difficulty,
        mode: "normal",
        night: number,
      });
      const times = nightLogic.storyArrivals(n);
      assert.ok(times.length >= 10 && times.length <= 14);
      assert.ok(times.every((t, i) => t < 600 && (!i || t > times[i - 1])));
      for (let i = 0; i < times.length; i++) {
        const id = nightLogic.scheduledVisitor(
          { ...n, elapsed: times[i] },
          { ...visitors.freshEncounters(), sequence: i },
        );
        const v = visitors.visitorForDifficulty(id, difficulty);
        assert.ok(v);
        assert.equal(Object.keys(v.dialogue).length, 3);
        if (v.kind === "anomaly") assert.ok(v.clues.length);
      }
    }
  assert.notDeepEqual(
    visitors.visitorForDifficulty("echo", "easy").dialogue,
    visitors.visitorForDifficulty("echo", "hard").dialogue,
  );
});
test("story unlocks, continuation, per-difficulty completion and ending are guarded", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  useGame.setState({
    save: g.newSave(),
    selectedNight: 3,
    mode: "normal",
    difficulty: "hard",
    panel: null,
    focused: true,
    runSeconds: 300,
  });
  useGame.getState().start();
  assert.equal(useGame.getState().room.night.number, 1);
  for (let number = 1; number <= 3; number++) {
    const s = useGame.getState();
    assert.equal(s.room.night.number, number);
    useGame.setState({
      room: {
        ...s.room,
        view: "explore",
        night: { ...s.room.night, elapsed: 599.9 },
      },
    });
    useGame.getState().tickVisitors(0.25);
    for(let i=0;i<24;i++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().save.completedNights, number);
    assert.ok(useGame.getState().save.completions.hard.includes(number));
    const coins = useGame.getState().save.coins;
    useGame.getState().tickVisitors(0.25);
    assert.equal(useGame.getState().save.coins, coins);
    if (number < 3) useGame.getState().nextNight();
  }
  const before = useGame.getState().room;
  useGame.setState({ panel: "pause" });
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().room, before);
  useGame.setState({ panel: null });
  for (let i = 0; i < 60; i++) useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().save.endingViewed, true);
  assert.equal(useGame.getState().save.coins, 300);
  const end = useGame.getState();
  end.nextNight();
  assert.equal(useGame.getState().room, end.room);
  assert.deepEqual(g.readSave(JSON.stringify(end.save)), end.save);
});
test("Infinite judges at dawn, resets shift rules and counts milestones once", async () => {
  const n = nightLogic.freshNight(300, {
    night: 1,
    mode: "infinite",
    difficulty: "hard",
  });
  const next = nightLogic.advanceNight(
    { ...n, elapsed: 599.9 },
    0.25,
    false,
    2,
  );
  assert.equal(next.status, "judging");
  assert.equal(next.number, 1);
  assert.equal(next.elapsed, 600);
  assert.equal(nightLogic.infiniteInterval({ ...n, number: 999 }), 540/13);
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  useGame.setState({
    save: g.newSave(),
    mode: "infinite",
    selectedNight: 3,
    difficulty: "hard",
    panel: null,
    focused: true,
    runSeconds: 300,
  });
  useGame.getState().start();
  assert.equal(useGame.getState().room.night.number, 1);
  const s = useGame.getState();
  useGame.setState({
    room: {
      ...s.room,
      view: "explore",
      night: { ...s.room.night, elapsed: 599.9 },
      encounters: { ...s.room.encounters, trust: 2, correct: 4, bestStreak: 3 },
    },
  });
  useGame.getState().tickVisitors(0.25);
  assert.equal(useGame.getState().save.infiniteRecords.totalNights,0);
  for(let i=0;i<24;i++)useGame.getState().tickVisitors(.25);
  const saved = useGame.getState().save;
  assert.equal(saved.infiniteRecords.totalNights, 1);
  assert.equal(saved.infiniteRecords.night, 2);
  assert.equal(saved.infiniteRecords.correct, 4);
  assert.equal(saved.infiniteRecords.streak, 3);
  assert.equal(saved.completedNights, 0);
  assert.equal(saved.coins, 150);
  assert.equal(useGame.getState().room.encounters.trust, 3);
  assert.equal(
    progression.recordInfiniteNight(saved, s.room.encounters.runId, 1),
    saved,
  );
  assert.equal(
    progression.recordInfiniteNight(saved, "another-run", 1).infiniteRecords
      .totalNights,
    2,
  );
});
test("streak resets once on a mistake while the best streak survives", () => {
  const e = waiting();
  e.streak = 3;
  e.bestStreak = 3;
  const good = visitors.resolveEncounter(e, e.active.id, "admit");
  assert.equal(good.streak, 4);
  assert.equal(good.bestStreak, 4);
  const bad = visitors.resolveEncounter(e, e.active.id, "reject");
  assert.equal(bad.streak, 0);
  assert.equal(bad.bestStreak, 3);
});

test("all nine story/difficulty combinations finish full runs with their scheduled visitors", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  for (const difficulty of ["easy", "medium", "hard"])
    for (let number = 1; number <= 3; number++) {
      useGame.setState({
        save: { ...g.newSave(), completedNights: 2 },
        selectedNight: number,
        mode: "normal",
        difficulty,
        panel: null,
        focused: true,
        runSeconds: 300,
      });
      useGame.getState().start();
      const expected = nightLogic.storyArrivals(
        useGame.getState().room.night,
      ).length;
      for (let i = 0; i < 2400; i++) {
        const s = useGame.getState();
        if (s.room.door === "OPENING") s.doorEvent({ type: "opened" });
        if (s.room.door === "CLOSING") s.doorEvent({ type: "closed" });
        const e = s.room.encounters.active;
        if (e?.phase === "waiting") {
          s.roomView("door");
          useGame
            .getState()
            .decideVisitor(
              e.id,
              visitors.visitorById(e.visitor).kind === "human"
                ? "admit"
                : "reject",
            );
        }
        useGame.getState().tickVisitors(0.25);
      }
      assert.equal(useGame.getState().room.night.status, "completed");
      assert.equal(
        useGame.getState().room.encounters.correct,
        expected,
        `${number} ${difficulty}`,
      );
      assert.equal(useGame.getState().save.coins, 200 + 5 * expected);
    }
});

test("difficulty completion tracks individual nights rather than implying earlier replays", () => {
  const s = progression.recordStory(g.newSave(), 3, "hard");
  assert.deepEqual(s.completions.hard, [3]);
  assert.deepEqual(
    progression.recordStory(s, 1, "hard").completions.hard,
    [1, 3],
  );
  assert.deepEqual(progression.recordStory(s, 3, "hard").completions.hard, [3]);
});

const accessoryLogic = await import(
  await moduleUrl(resolve("lib/deader/cosmetics.ts"))
);
const achievementLogic = await import(
  await moduleUrl(resolve("lib/deader/achievements.ts"))
);
test("v1 migration preserves existing progress and v2 validates accessory slots", () => {
  const legacy = {
    ...g.newSave(),
    version: 1,
    coins: 17,
    owned: ["yellow", "blue"],
    equipped: "blue",
    completedNights: 2,
    claimedRewards: ["old-reward"],
    endingViewed: true,
  };
  delete legacy.ownedAccessories;
  delete legacy.outfit;
  delete legacy.achievements;
  const migrated = g.readSave(JSON.stringify(legacy));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.coins, 17);
  assert.equal(migrated.equipped, "blue");
  assert.equal(migrated.completedNights, 2);
  assert.equal(migrated.endingViewed, true);
  assert.deepEqual(migrated.claimedRewards, ["old-reward"]);
  assert.deepEqual(migrated.outfit, accessoryLogic.emptyOutfit());
  const invalid = g.readSave(
    JSON.stringify({
      ...migrated,
      ownedAccessories: ["watch-cap", "watch-cap", "fake"],
      outfit: {
        hat: "round-glasses",
        backpack: "shift-pack",
        glasses: "watch-cap",
      },
      achievements: ["fake", "first-survivor", "first-survivor"],
    }),
  );
  assert.deepEqual(invalid.ownedAccessories, ["watch-cap"]);
  assert.deepEqual(invalid.outfit, accessoryLogic.emptyOutfit());
  assert.deepEqual(invalid.achievements, ["first-survivor"]);
  assert.deepEqual(g.readSave(JSON.stringify(invalid)), invalid);
});
test("accessory purchases and category equipment enforce affordability, ownership and unequip", () => {
  const initial = g.newSave();
  assert.equal(
    accessoryLogic.equipAccessory(initial, "hat", "watch-cap"),
    initial,
  );
  let s = accessoryLogic.purchaseAccessory(initial, "watch-cap");
  assert.equal(s.coins, 90);
  assert.equal(accessoryLogic.purchaseAccessory(s, "watch-cap"), s);
  s = accessoryLogic.purchaseAccessory(s, "shift-pack");
  assert.equal(s.coins, 10);
  assert.equal(accessoryLogic.purchaseAccessory(s, "round-glasses"), s);
  assert.equal(accessoryLogic.equipAccessory(s, "glasses", "watch-cap"), s);
  s = accessoryLogic.equipAccessory(s, "hat", "watch-cap");
  s = accessoryLogic.equipAccessory(s, "backpack", "shift-pack");
  assert.equal(s.outfit.hat, "watch-cap");
  assert.equal(s.outfit.backpack, "shift-pack");
  s = accessoryLogic.equipAccessory(s, "hat", null);
  assert.equal(s.outfit.hat, null);
  assert.equal(s.outfit.backpack, "shift-pack");
  assert.deepEqual(g.readSave(JSON.stringify(s)), s);
  assert.equal(s.coins, 10);
});
test("achievement eligibility and once-only claims survive reload without granting starter coins", () => {
  let s = g.newSave();
  assert.equal(achievementLogic.claimAchievement(s, "first-survivor"), s);
  assert.equal(achievementLogic.unlockAchievements(s), s);
  s = achievementLogic.unlockAchievements(
    {
      ...s,
      completedNights: 3,
      infiniteRecords: { ...s.infiniteRecords, totalNights: 5 },
      owned: ["yellow", "green", "pink", "blue", "black"],
      ownedAccessories: ["watch-cap"],
    },
    true,
  );
  assert.equal(s.achievements.length, 5);
  assert.equal(s.coins, 150);
  for (const a of achievementLogic.achievements) {
    s = achievementLogic.claimAchievement(s, a.id);
    const again = achievementLogic.claimAchievement(s, a.id);
    assert.equal(again, s);
  }
  assert.equal(s.coins, 395);
  s = g.readSave(JSON.stringify(s));
  assert.equal(achievementLogic.unlockAchievements(s, true), s);
  for (const a of achievementLogic.achievements)
    assert.equal(achievementLogic.claimAchievement(s, a.id), s);
});
test("five purchased cosmetics excludes the free starter colour", () => {
  const s = {
    ...g.newSave(),
    owned: ["yellow", "green", "pink", "blue", "black"],
  };
  assert.ok(
    !achievementLogic
      .unlockAchievements(s)
      .achievements.includes("fashion-cone"),
  );
  assert.ok(
    achievementLogic
      .unlockAchievements({ ...s, ownedAccessories: ["round-glasses"] })
      .achievements.includes("fashion-cone"),
  );
});
test("store completion unlocks Trust Expert only for real, non-idle, mistake-free nights", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  for (const [duration, correct, mistakes, expected] of [
    [300, 1, 0, true],
    [300, 0, 0, false],
    [300, 1, 1, false],
    [60, 1, 0, false],
  ]) {
    const r = room.freshRoom("achievement-test", duration, {
      difficulty: "easy",
      mode: "normal",
      night: 1,
    });
    r.view = "explore";
    r.night.elapsed = 599.9;
    r.encounters.correct = correct;
    r.encounters.mistakes = mistakes;
    useGame.setState({
      save: g.newSave(),
      scene: "room",
      panel: null,
      focused: true,
      room: r,
    });
    useGame.getState().tickVisitors(0.25);
    for(let i=0;i<24;i++)useGame.getState().tickVisitors(.25);
    assert.equal(
      useGame.getState().save.achievements.includes("trust-expert"),
      expected,
    );
    assert.equal(
      useGame.getState().save.achievements.includes("first-survivor"),
      duration === 300,
    );
  }
});
test("store purchases, achievement claims and outfit persist across hydration", async () => {
  const { useGame, SAVE_KEY } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  const old = { ...g.newSave(), version: 1, completedNights: 1 };
  memory.set(SAVE_KEY, JSON.stringify(old));
  useGame.setState({ ready: false });
  useGame.getState().hydrate();
  assert.ok(useGame.getState().save.achievements.includes("first-survivor"));
  useGame.getState().claim("first-survivor");
  useGame.getState().claim("first-survivor");
  useGame.getState().buyAccessory("watch-cap");
  useGame.getState().wearAccessory("hat", "watch-cap");
  useGame.setState({ ready: false });
  useGame.getState().hydrate();
  assert.equal(useGame.getState().save.coins, 110);
  assert.equal(useGame.getState().save.outfit.hat, "watch-cap");
  useGame.getState().claim("first-survivor");
  assert.equal(useGame.getState().save.coins, 110);
});

const presentation = await import(
  await moduleUrl(resolve("lib/deader/presentation.ts"))
);
test("Phase 8 settings migrate, clamp and preserve existing progression", () => {
  const old = {
    ...g.newSave(),
    coins: 21,
    settings: { volume: 0.4, muted: true, quality: "low" },
  };
  const saved = g.readSave(JSON.stringify(old));
  assert.equal(saved.coins, 21);
  assert.equal(saved.settings.muted, true);
  assert.equal(saved.settings.sensitivity, 1);
  assert.equal(presentation.renderScale(saved.settings), 1);
  const bad = g.readSave(
    JSON.stringify({
      ...old,
      settings: {
        sensitivity: 999,
        resolution: 0,
        ambience: -3,
        shadows: false,
        effects: false,
      },
    }),
  );
  assert.equal(bad.settings.sensitivity, 2);
  assert.equal(bad.settings.resolution, 0.75);
  assert.equal(bad.settings.ambience, 0);
  assert.equal(bad.settings.shadows, false);
  assert.equal(bad.settings.effects, false);
  assert.deepEqual(g.readSave(JSON.stringify(bad)), bad);
});
test("presentation variants are bounded and reduced motion neutralises decorative animation", () => {
  for (const state of [
    "idle",
    "walk",
    "turn",
    "knock",
    "talk",
    "suspicious",
    "attack",
    "react",
  ]) {
    assert.deepEqual(presentation.characterPose(state, 4, true), {
      bob: 0,
      tilt: 0,
      arm: 0,
      jaw: 1,
    });
    assert.ok(
      Object.values(presentation.characterPose(state, 4)).every(
        Number.isFinite,
      ),
    );
  }
  assert.equal(presentation.scareVariant("three"), "rush");
  assert.equal(presentation.scareVariant("grin"), "lean");
  assert.equal(presentation.scareVariant("loop"), "stutter");
  for (const variant of ["rush", "lean", "stutter"]) {
    let last = 0;
    for (let t = 0; t < 2; t += 0.01) {
      const a = presentation.attackAmount(variant, t);
      assert.ok(a >= last - 1e-10 && a <= 1);
      last = a;
    }
  }
  assert.ok(
    presentation.attackAmount("lean", 0.65) <
      presentation.attackAmount("rush", 0.65),
  );
  for (let i = 0; i < 120; i++)
    assert.ok(
      presentation.ambienceLevel(i) >= 0.099 &&
        presentation.ambienceLevel(i) <= 1,
    );
  assert.equal(presentation.ambienceLevel(52), 0.1);
  assert.equal(presentation.ambienceLevel(60), 1);
});
test("audio has gesture gating, bounded voices, reusable ambience and complete teardown", async () => {
  const { RoomAudio } = await import(
    await moduleUrl(resolve("lib/deader/audio/room-audio.ts"))
  );
  const previous = globalThis.AudioContext;
  let contexts = 0,
    closed = 0;
  class Node {
    gain = {
      value: 0,
      setTargetAtTime() {},
      setValueAtTime() {},
      exponentialRampToValueAtTime() {},
    };
    frequency = { ...this.gain };
    pan = { value: 0 };
    onended = null;
    connect(n) {
      return n;
    }
    disconnect() {}
    start() {}
    stop(time) {
      if (time === undefined) this.onended?.();
    }
  }
  globalThis.AudioContext = class {
    state = "running";
    currentTime = 0;
    sampleRate = 100;
    destination = {};
    constructor() {
      contexts++;
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      closed++;
      this.state = "closed";
      return Promise.resolve();
    }
    createOscillator() {
      return new Node();
    }
    createGain() {
      return new Node();
    }
    createBufferSource() {
      return new Node();
    }
    createBiquadFilter() {
      return new Node();
    }
    createStereoPanner() {
      return new Node();
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(200) };
    }
  };
  try {
    const a = new RoomAudio();
    a.play("news");
    a.lobbyMusic(.5);
    assert.equal(a.diagnostics().musicSources,0);
    a.ambience(0.5);
    assert.equal(contexts, 0);
    a.unlock();
    a.unlock();
    assert.equal(contexts, 1);
    a.lobbyMusic(.5);a.lobbyMusic(.8);
    assert.equal(a.diagnostics().musicSources,1);
    a.lobbyMusic(0);assert.equal(a.diagnostics().musicSources,0);
    a.lobbyMusic(.5);
    a.ambience(0.5);
    a.ambience(1, true);
    assert.equal(a.diagnostics().ambientSources, 2);
    a.broadcast(true);
    a.broadcast(true);
    assert.equal(a.diagnostics().broadcastSources, 1);
    for (let i = 0; i < 20; i++) a.play("knock");
    assert.equal(a.diagnostics().voices, 12);
    a.silence();
    assert.equal(a.diagnostics().voices, 0);
    assert.equal(a.diagnostics().musicSources, 0);
    assert.equal(a.diagnostics().ambientSources, 0);
    assert.equal(a.diagnostics().broadcastSources, 0);
    a.muted = true;
    a.play("scare");
    a.ambience(1);
    assert.equal(a.diagnostics().voices, 0);
    assert.equal(a.diagnostics().ambientSources, 0);
    a.muted = false;
    a.ambience(1);
    a.play("stutter");
    a.dispose();
    assert.equal(closed, 1);
    assert.deepEqual(a.diagnostics(), {
      voices: 0,
      ambientSources: 0,
      broadcastSources: 0,
      musicSources: 0,
      context: "locked",
    });
    a.unlock();
    assert.equal(contexts, 2);
    a.dispose();
  } finally {
    globalThis.AudioContext = previous;
  }
});

const persistence = await import(
  await moduleUrl(resolve("lib/deader/persistence.ts"))
);
test("corrupt and future saves are preserved instead of overwritten during play", () => {
  for (const raw of [
    "{broken",
    "null",
    "[]",
    JSON.stringify({ version: 99, coins: 500 }),
  ]) {
    let data = raw;
    const storage = {
      getItem: () => data,
      setItem: (_, v) => {
        data = v;
      },
    };
    assert.ok(persistence.loadLocalSave(storage).notice);
    assert.equal(persistence.writeLocalSave(storage, g.newSave()), false);
    assert.equal(data, raw);
  }
  let data = null;
  const storage = {
    getItem: () => data,
    setItem: (_, v) => {
      data = v;
    },
  };
  assert.equal(persistence.loadLocalSave(storage).notice, null);
  assert.equal(persistence.writeLocalSave(storage, g.newSave()), true);
  const migrated = persistence.loadLocalSave(storage);
  assert.equal(migrated.save.coins, 150);
  data = JSON.stringify({ ...migrated.save, version: 1, coins: 0 });
  assert.equal(
    persistence.writeLocalSave(
      storage,
      persistence.loadLocalSave(storage).save,
    ),
    true,
  );
  assert.equal(JSON.parse(data).version, 2);
  assert.equal(JSON.parse(data).coins, 0);
});
test("store preserves unreadable save and clearly marks temporary play unsaved", async () => {
  const { useGame } = await import(
    await moduleUrl(resolve("lib/deader/store.ts"))
  );
  let raw = "{broken";
  globalThis.localStorage = {
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
  };
  useGame.setState({ ready: false });
  useGame.getState().hydrate();
  assert.equal(useGame.getState().storageFailed, true);
  assert.ok(useGame.getState().saveNotice);
  useGame.getState().buy("green");
  useGame.getState().settings({ muted: true });
  assert.equal(raw, "{broken");
});

test('WebGL compatibility probe catches unavailable and throwing drivers',async()=>{
  const {supportsWebGL2}=await import(await moduleUrl(resolve('lib/deader/compatibility.ts')));
  assert.equal(supportsWebGL2(()=>({getContext:()=>null})),false);
  assert.equal(supportsWebGL2(()=>({getContext:()=>{throw new Error('blocked');}})),false);
  let released=0;
  assert.equal(supportsWebGL2(()=>({getContext:()=>({getExtension:()=>({loseContext:()=>released++})})})),true);
  assert.equal(released,1);
  assert.equal(supportsWebGL2(()=>({getContext:()=>({getExtension:()=>{throw new Error('cleanup unsupported');}})})),true);
});

test("decision deadlines are real active seconds, difficulty-specific and exactly once", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    for (const visitor of ["bea", "three"]) {
      let s = { ...visitors.freshEncounters("deadline"), streak: 4, bestStreak: 4,
        active: {id:"deadline:1", visitor, phase:"waiting",elapsed:0,asked:[],decision:null} };
      assert.equal(visitors.tickEncounters(s, 10, difficulty, true, true), s);
      assert.equal(visitors.tickEncounters(s, 10, difficulty, false, true, {rate:10}).active.elapsed, .25);
      const limit = visitors.DECISION_SECONDS[difficulty];
      for (let i=0;i<limit*4-1;i++) s=visitors.tickEncounters(s,.25,difficulty,false,true,{rate:10});
      assert.equal(s.active.phase,"waiting");
      s=visitors.tickEncounters(s,.25,difficulty,false,true,{rate:10});
      assert.equal(s.result.decision,"timeout");
      assert.equal(s.trust,2); assert.equal(s.mistakes,1); assert.equal(s.earned,0);
      assert.equal(s.streak,0); assert.equal(s.bestStreak,4);
      assert.equal(visitors.expireEncounter(s,"deadline:1"),s);
      assert.equal(visitors.resolveEncounter(s,"deadline:1","reject"),s);
    }
  }
});
test("store freezes decision deadlines and resolves timeouts without a scare",async()=>{
  const {useGame}=await import(await moduleUrl(resolve("lib/deader/store.ts")));
  useGame.setState({save:g.newSave(),focused:true,panel:null});
  useGame.getState().start();
  let base=useGame.getState().room;
  const waiting={...visitors.freshEncounters("timeout-store"),active:{id:"timeout-store:1",visitor:"bea",phase:"waiting",elapsed:59.75,asked:[],decision:null}};
  const room={...base,view:"door",door:"VISITOR_WAITING",encounters:waiting,night:{...base.night,introFinished:true,elapsed:100}};
  useGame.setState({room,panel:"pause"});
  useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.encounters.active.elapsed,59.75);
  useGame.setState({panel:null,focused:false});
  useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.encounters.active.elapsed,59.75);
  useGame.setState({focused:true,room:{...room,view:"explore"}});
  useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.encounters.result.decision,"timeout");
  useGame.setState({room});
  useGame.getState().tickVisitors(.25);
  const after=useGame.getState();
  assert.equal(after.room.encounters.trust,2);
  assert.equal(after.room.encounters.result.decision,"timeout");
  assert.equal(after.room.view,"explore");
  assert.equal(after.room.survival.phase,"idle");
  assert.equal(after.save.coins,150);
  useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.encounters.trust,2);
});

test("ignoring visitors reaches Game Over without completion rewards", async () => {
  const {useGame}=await import(await moduleUrl(resolve("lib/deader/store.ts")));
  for (const difficulty of ["easy","medium","hard"]) {
    useGame.setState({save:g.newSave(),selectedNight:1,mode:"normal",difficulty,panel:null,focused:true,runSeconds:300});
    useGame.getState().start();
    for(let i=0;i<2600;i++){
      const s=useGame.getState();
      if(s.room.door==="CLOSING") s.doorEvent({type:"closed"});
      s.tickVisitors(.25);
      if(useGame.getState().room.survival.phase==="gameover") break;
    }
    const s=useGame.getState();
    assert.equal(s.room.survival.phase,"gameover",difficulty);
    assert.equal(s.room.encounters.trust,0);
    assert.ok(s.room.encounters.mistakes>=3);
    assert.equal(s.room.night.elapsed,600);
    assert.equal(s.save.coins,150);
    assert.equal(s.save.completedNights,0);
  }
});

test("touch joystick preserves analogue speed, dead zone and bounded diagonals", async () => {
  const {joystick,GameInput}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  assert.deepEqual(joystick(7,0),{x:0,z:0});
  assert.ok(Math.abs(joystick(54,0).x-1)<1e-9);
  const half=joystick(31.05,0);
  assert.ok(Math.abs(half.x-.5)<1e-9);
  const diagonal=joystick(100,100);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9);
  const input=new GameInput();
  input.axes=half;
  const slow=g.move({x:0,z:0},input.movement().x,0,.02,5,[]);
  assert.ok(Math.abs(slow.x-g.move({x:0,z:0},1,0,.02,5,[]).x/2)<1e-9);
  input.keys.add("KeyD");
  assert.equal(input.movement().x,1);
});
test("touch fingers have independent ownership and cancellation cannot leave input held",async()=>{
  const {GameInput}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  const input=new GameInput();
  assert.equal(input.claim("move",1),true);
  assert.equal(input.claim("look",1),false);
  assert.equal(input.claim("move",3),false);
  assert.equal(input.claim("look",2),true);
  input.axes={x:1,z:0}; input.look={x:15,y:4};
  assert.deepEqual(input.consumeLook(),{x:15,y:4});
  assert.deepEqual(input.consumeLook(),{x:0,y:0});
  input.release(2);
  assert.equal(input.axes.x,1);
  input.release(1);
  assert.deepEqual(input.movement(),{x:0,z:0});
  input.claim("move",4);input.keys.add("KeyW");input.reset();
  assert.equal(input.owners.move,null);
  assert.deepEqual(input.movement(),{x:0,z:0});
});
test("mobile settings migrate without changing visual defaults or saved progress",()=>{
  const original=g.newSave();
  const migrated=g.readSave(JSON.stringify({...original,settings:{quality:"standard",resolution:1.5}}));
  assert.equal(migrated.settings.controls,"auto");
  assert.equal(migrated.settings.touchSensitivity,1);
  assert.equal(migrated.settings.shadows,true);
  assert.equal(migrated.coins,150);
  const invalid=g.readSave(JSON.stringify({...original,settings:{controls:"bad",touchSensitivity:20}}));
  assert.equal(invalid.settings.controls,"auto");
  assert.equal(invalid.settings.touchSensitivity,2);
});
test("interruption suspension freezes encounters, night and survival in either orientation",async()=>{
  const {useGame}=await import(await moduleUrl(resolve("lib/deader/store.ts")));
  for(const suspension of ["interrupted"]){
    useGame.setState({save:g.newSave(),focused:true,panel:null,suspension:null,runSeconds:300});
    useGame.getState().start();
    useGame.setState({suspension});
    const room=useGame.getState().room;
    useGame.getState().tickVisitors(30);
    assert.equal(useGame.getState().room,room);
    useGame.setState({room:{...room,view:"door",encounters:waiting(),survival:{phase:"recovery",elapsed:0,kind:"mistake",encounterId:"test"}}});
    const stopped=useGame.getState().room;
    useGame.getState().tickVisitors(.25);
    useGame.getState().decideVisitor(stopped.encounters.active.id,"admit");
    assert.equal(useGame.getState().room,stopped);
  }
  useGame.setState({suspension:null});
});

test("portrait and landscape swipes have equal sensitivity", async () => {
  const {touchLookScale}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  assert.equal(touchLookScale(390,844),1);
  assert.equal(touchLookScale(844,390),1);
  assert.equal(touchLookScale(820,1180),touchLookScale(1180,820));
  assert.equal(touchLookScale(200,300),390/320);
});

test("only real page departures require Resume", async () => {
  const {requiresResume}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  assert.equal(requiresResume("blur"),false);
  assert.equal(requiresResume("resize"),false);
  assert.equal(requiresResume("hidden"),true);
  assert.equal(requiresResume("pagehide"),true);
});
test("CCTV transitions discard held keys, pointers and old look deltas", async () => {
  const {gameInput}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  const {useGame}=await import(await moduleUrl(resolve("lib/deader/store.ts")));
  useGame.setState({save:g.newSave(),panel:null,suspension:null,focused:true});
  useGame.getState().start();
  gameInput.keyDown("KeyW",false,true);
  gameInput.claim("move",12); gameInput.axes={x:0,z:-1}; gameInput.look={x:100,y:10};
  useGame.getState().roomView("cctv");
  useGame.getState().roomView("explore");
  gameInput.keyDown("KeyW",true,true);
  assert.deepEqual(gameInput.movement(),{x:0,z:0});
  assert.deepEqual(gameInput.consumeLook(),{x:0,y:0});
  assert.equal(gameInput.owners.move,null);
  gameInput.keyUp("KeyW"); gameInput.keyDown("KeyW",false,true);
  assert.equal(gameInput.movement().z,-1);
  gameInput.keyUp("KeyW");gameInput.reset();
});
test("TV loops independently and attenuates from the physical player", async () => {
  const tv=await import(await moduleUrl(resolve("lib/deader/tv.ts")));
  assert.ok(Math.abs(tv.loopBroadcast(39.9,.25,40)-.15)<1e-8);
  assert.equal(tv.loopBroadcast(2,NaN,40),2);
  assert.ok(tv.tvSound(3,0,0).gain>tv.tvSound(-3,3,0).gain);
  assert.ok(tv.tvSound(0,0,0).pan>0);
  assert.ok(tv.tvSound(0,0,Math.PI).pan<0);
  const {useGame}=await import(await moduleUrl(resolve("lib/deader/store.ts")));
  useGame.setState({save:g.newSave(),panel:null,suspension:null,focused:true});useGame.getState().start();
  const report=room.newsForNight(1), duration=room.broadcastDuration(report);
  useGame.setState({room:{...useGame.getState().room,newsSeconds:duration-.1,night:{...useGame.getState().room.night,elapsed:100}}});
  useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.view,"explore");
  assert.equal(useGame.getState().room.night.elapsed,100.5);
  assert.ok(useGame.getState().room.newsSeconds<.2);
  assert.equal(useGame.getState().room.encounters.active.phase,"approaching");
});
test("door confirmation rejects departed, timed out and replacement encounters", () => {
  const r={...room.freshRoom(),view:"door",door:"VISITOR_WAITING",encounters:waiting()};
  const id=r.encounters.active.id;
  assert.equal(room.canConfirmDoor(r,id),true);
  assert.equal(room.canConfirmDoor(r,"old-visitor"),false);
  assert.equal(room.canConfirmDoor({...r,view:"inspect"},id),false);
  assert.equal(room.canConfirmDoor({...r,encounters:{...r.encounters,active:{...r.encounters.active,phase:"departing"}}},id),false);
  assert.equal(room.canConfirmDoor({...r,survival:{...r.survival,phase:"tension"}},id),false);
});

test("quick swipes retain their final movement until the next rendered frame", async () => {
  const {GameInput}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  const input=new GameInput();
  input.claim("move",1); input.axes={x:.5,z:-.5};
  input.claim("look",2); input.look={x:90,y:-12};
  input.release(2);
  // Browser automatically releases capture after pointer-up: it must not erase the completed swipe.
  input.release(2,true);
  assert.deepEqual(input.consumeLook(),{x:90,y:-12});
  assert.deepEqual(input.consumeLook(),{x:0,y:0});
  assert.deepEqual(input.axes,{x:.5,z:-.5});
  input.claim("look",3);input.look={x:20,y:10};input.release(3,true);
  assert.deepEqual(input.consumeLook(),{x:0,y:0});
  input.claim("look",4);input.look={x:20,y:10};input.reset();
  assert.deepEqual(input.consumeLook(),{x:0,y:0});
});
test("browser toolbar height changes preserve swipes while rotation clears them", async () => {
  const {shouldResetTouchOnResize}=await import(await moduleUrl(resolve("lib/deader/input.ts")));
  assert.equal(shouldResetTouchOnResize(390,390),false);
  assert.equal(shouldResetTouchOnResize(390,390.5),false);
  assert.equal(shouldResetTouchOnResize(390,844),true);
  assert.equal(shouldResetTouchOnResize(844,390),true);
});

test("lounge admissions allocate unique seats and clear with a fresh room",async()=>{
  const l=await import(await moduleUrl(resolve('lib/deader/lounge.ts')));
  const room=await import(await moduleUrl(resolve('lib/deader/room.ts')));
  let residents=l.admitResident([], 'one','bea');
  assert.equal(l.admitResident(residents,'one','bea'),residents);
  assert.equal(l.tickResidents(residents,.25,false)[0].elapsed,0);
  for(let i=0;i<32;i++)residents=l.tickResidents(residents,.25,true);
  assert.equal(residents[0].phase,'seated');
  assert.deepEqual(l.residentPosition(residents[0]),{...l.SEATS[0],y:.25});
  for(let i=1;i<12;i++)residents=l.admitResident(residents,`resident-${i}`,'bea');
  assert.equal(new Set(residents.map(r=>r.seat)).size,12);
  residents=l.admitResident(residents,'overflow','bea');
  assert.equal(residents[0].phase,'leaving');
  assert.equal(l.tickResidents(residents,.25).at(-1).elapsed,0);
  for(let i=0;i<12;i++)residents=l.tickResidents(residents,.25);
  assert.equal(residents.length,12);
  assert.ok(l.tickResidents(residents,.25).at(-1).elapsed>0);
  assert.deepEqual(room.freshRoom().residents,[]);
});
test("office and lounge connect only through their doorway and seats block movement",async()=>{
  const {moveInRooms}=await import(await moduleUrl(resolve('lib/deader/lounge.ts')));
  let p={x:0,z:3.3};for(let i=0;i<25;i++)p=moveInRooms(p,0,1,.05,false);
  assert.ok(p.z>6);
  let blocked={x:2,z:3.3};for(let i=0;i<25;i++)blocked=moveInRooms(blocked,0,1,.05,false);
  assert.ok(blocked.z<3.5);
  let chair={x:1.2,z:4.5};for(let i=0;i<20;i++)chair=moveInRooms(chair,0,1,.05,false);
  assert.ok(chair.z<5);
  const diagonal=moveInRooms({x:0,z:0},1,1,.05,false),straight=moveInRooms({x:0,z:0},1,0,.05,false);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-straight.x)<1e-9);
  assert.deepEqual(moveInRooms({x:0,z:0},1,0,5,false),straight);
});
test("new surveillance views and nearest TV audio cover the lounge",async()=>{
  const {FEEDS}=await import(await moduleUrl(resolve('lib/deader/room.ts')));
  const {tvSound}=await import(await moduleUrl(resolve('lib/deader/tv.ts')));
  assert.equal(FEEDS.length,6);
  assert.equal(FEEDS[4].label,'Door rear');assert.ok(FEEDS[4].position[2]<-5.9);
  assert.equal(FEEDS[5].label,'Holding lounge');
  assert.ok(tvSound(0,9,Math.PI).gain>.6);
});

test("TV viewing keeps the night running and returns without stale movement",async()=>{
  const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
  useGame.setState({scene:'room',panel:null,focused:true,suspension:null,room:room.freshRoom('tv-test',300,g.createSession('easy','normal'))});
  useGame.getState().roomView('tv');
  useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.view,'tv');
  assert.equal(useGame.getState().room.night.elapsed,.5);
  assert.ok(useGame.getState().room.newsSeconds>0);
  useGame.getState().escape();assert.equal(useGame.getState().room.view,'explore');
  useGame.getState().roomView('lounge-tv');useGame.getState().escape();
  assert.equal(useGame.getState().room.view,'explore');
});
test("all admitted visitors become residents exactly once under delayed judgement",async()=>{
  const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
  for(const [visitor,decision,expected] of [['bea','admit',1],['bea','reject',0],['three','admit',1],['three','reject',0]]){
    useGame.setState({save:g.newSave(),scene:'room',panel:null,focused:true,suspension:null,room:{...room.freshRoom(),view:'door',door:'VISITOR_WAITING',visitorId:'test-run:1',encounters:waiting(visitor)}});
    useGame.getState().decideVisitor('test-run:1',decision);
    useGame.getState().decideVisitor('test-run:1',decision);
    assert.equal(useGame.getState().room.residents.length,expected);
  }
});
test("development rehearsal fixtures cannot seed production-length nights",async()=>{
  const {rehearse}=await import(await moduleUrl(resolve('lib/deader/rehearsal.ts')));
  const standard=room.freshRoom('prod',300,g.createSession('easy','normal'));
  assert.equal(rehearse(standard,'scare'),standard);
  const short=room.freshRoom('test',60,g.createSession('easy','normal'));
  assert.equal(rehearse(short,'lounge').residents.length,12);
  assert.equal(rehearse(short,'scare').encounters.active.visitor,'three');
});

test("close-up scares respect gentle and reduced-motion settings without changing timing", async()=>{
  const {closeScarePose}=await import(await moduleUrl(resolve('lib/deader/presentation.ts')));
  assert.equal(closeScarePose(0,false,false).distance,2.4);
  assert.ok(closeScarePose(.15,false,false).distance<1);
  assert.equal(closeScarePose(.65,false,false).distance,closeScarePose(.15,false,false).distance);
  assert.deepEqual(closeScarePose(0,true,false),closeScarePose(.5,true,false));
  assert.equal(closeScarePose(.4,false,true).roll,0);
  assert.equal(closeScarePose(.4,false,true).distance,1.1);
  assert.ok(closeScarePose(.4,true,false).scale<closeScarePose(.4,false,false).scale);
});

test("five active minutes reach dawn and the first knock arrives in fifteen seconds",async()=>{
  const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
  for(const difficulty of ['easy','medium','hard']) {
    useGame.setState({save:g.newSave(),scene:'lobby',panel:null,focused:true,suspension:null,selectedNight:1,mode:'normal',difficulty,runSeconds:300,rehearsal:'standard'});
    useGame.getState().start();
    for(let tick=0;tick<59;tick++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.encounters.active.phase,'approaching');
    for(let tick=0;tick<9&&useGame.getState().room.encounters.active.phase==='approaching';tick++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.encounters.active.phase,'waiting');
    for(let tick=0;tick<40;tick++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.encounters.active.elapsed,10); // Decision time remains real time.
    assert.equal(visitors.DECISION_SECONDS[difficulty],{easy:60,medium:45,hard:30}[difficulty]);
  }
  let n=nightLogic.freshNight();
  for(let tick=0;tick<1199;tick++) n=nightLogic.advanceNight(n,.25,false,3);
  assert.equal(n.status,'running');
  n=nightLogic.advanceNight(n,.25,false,3);
  assert.equal(n.status,'judging');assert.equal(g.clockLabel(n.elapsed),'5:55 AM');
});

const petsModule = await import(await moduleUrl(resolve('lib/deader/pets.ts')));
const arcadeModule = await import(await moduleUrl(resolve('lib/deader/arcade.ts')));
const tutorialModule = await import(await moduleUrl(resolve('lib/deader/tutorial.ts')));
test('sidekick purchases, equipment and additive save loading preserve balances',()=>{
  const original=g.newSave();
  const bought=petsModule.purchasePet(original,'pip');
  assert.equal(bought.coins,100);
  assert.equal(petsModule.purchasePet(bought,'pip'),bought);
  assert.equal(petsModule.purchasePet({...original,coins:49},'pip').coins,49);
  assert.equal(petsModule.equipPet(original,'pip'),original);
  const equipped=petsModule.equipPet(bought,'pip');
  assert.deepEqual(g.readSave(JSON.stringify(equipped)),equipped);
  assert.equal(petsModule.equipPet(equipped,null).equippedPet,null);
  const legacy={...original,coins:12,ownedPets:undefined,equippedPet:undefined};
  assert.equal(g.readSave(JSON.stringify(legacy)).coins,12);
  assert.deepEqual(g.readSave(JSON.stringify(legacy)).ownedPets,[]);
  const malformed=g.readSave(JSON.stringify({...legacy,ownedPets:['pip','pip','fake'],equippedPet:'shadow'}));
  assert.deepEqual(malformed.ownedPets,['pip']);assert.equal(malformed.equippedPet,null);
});
test('pets only describe observed visual and movement evidence, never hidden classifications',()=>{
  const visible=visitors.visitorById('three'),dialogue=visitors.visitorById('echo');
  assert.equal(petsModule.petHint(visible,[]),null);
  assert.match(petsModule.petHint(visible,['visual']),/third eye/i);
  assert.match(petsModule.petHint(visible,['cctv']),/Stops and starts/);
  assert.equal(petsModule.petHint(dialogue,['visual','cctv']),null);
  assert.equal(petsModule.petHint({...visible,kind:'human'},['visual']),petsModule.petHint(visible,['visual']));
});
test('arcade collisions, landing, hold jumps and frame gaps are deterministic',()=>{
  const start={...arcadeModule.freshArcade(),status:'running'};
  assert.equal(arcadeModule.stepArcade(arcadeModule.freshArcade(),1,true).x,0);
  assert.deepEqual(arcadeModule.stepArcade(start,10,false),arcadeModule.stepArcade(start,.05,false));
  assert.equal(arcadeModule.stepArcade(start,NaN,true),start);
  assert.ok(arcadeModule.stepArcade(start,.05,true).y>0);
  assert.equal(arcadeModule.stepArcade({...start,x:11.4},.05,false).status,'crashed');
  const landed=arcadeModule.stepArcade({...start,x:31.2,y:1.02,vy:-2,grounded:false},.02,false);
  assert.equal(landed.y,1);assert.equal(landed.grounded,true);
  assert.ok(arcadeModule.stepArcade(landed,.02,true).y>1);
  assert.equal(arcadeModule.stepArcade({...start,x:224.9},.05,false).status,'won');
  // An obstacle-aware simulated player can complete the handcrafted level.
  let run=start;
  for(let frame=0;frame<6000&&run.status==='running';frame++){
    const next=arcadeModule.arcadeLevel.filter(o=>o.x+o.w>run.x&&o.h>run.y+.1).sort((a,b)=>a.x-b.x)[0];
    const jump=!!next&&next.x-run.x<1.65;
    run=arcadeModule.stepArcade(run,1/120,jump);
  }
  assert.equal(run.status,'won');
});
test('guided practice freezes deadlines, protects rewards and permits forgiving retries',async()=>{
  const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
  globalThis.document={pointerLockElement:null};
  const save=g.newSave();useGame.setState({save,focused:true,suspension:null});
  useGame.getState().beginTutorial();assert.equal(useGame.getState().tutorial,'move');
  useGame.getState().tutorialAdvance('move');useGame.getState().tutorialAdvance('look');
  useGame.setState({prompt:'Learn to play'});useGame.getState().interactLobby();
  assert.equal(useGame.getState().tutorial,'inspect');
  for(let i=0;i<3000;i++)useGame.getState().tickVisitors(.25);
  let s=useGame.getState();assert.equal(s.room.encounters.active.elapsed,0);assert.equal(s.room.encounters.trust,3);
  s.doorEvent({type:'inspect'});const id=s.room.encounters.active.id;
  for(const q of ['identity','purpose','origin'])useGame.getState().askVisitor(id,q);
  assert.equal(useGame.getState().tutorial,'camera');
  useGame.getState().tutorialAdvance('camera');
  useGame.getState().decideVisitor(id,'reject');assert.equal(useGame.getState().room.encounters.trust,3);
  assert.match(useGame.getState().tutorialMessage,/Try again/);
  useGame.getState().decideVisitor(id,'admit');assert.equal(useGame.getState().tutorial,'tv');
  assert.deepEqual(useGame.getState().save,save);assert.equal(useGame.getState().room.residents.length,1);
  useGame.getState().roomView('tv');assert.equal(useGame.getState().tutorial,'finish');
  useGame.getState().lobby();assert.equal(useGame.getState().tutorial,null);
  assert.equal(tutorialModule.rewardsAllowed('finish',300),false);
  assert.equal(tutorialModule.rewardsAllowed(null,60),false);
  assert.equal(tutorialModule.rewardsAllowed(null,300),true);
});
test('arcade keeps night active, yields to knock and blocks relaunch until departure',async()=>{
  const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
  globalThis.document={pointerLockElement:null};
  useGame.setState({scene:'room',tutorial:null,panel:null,focused:true,suspension:null,session:g.createSession('easy','normal'),room:room.freshRoom('arcade-check',300)});
  useGame.getState().roomView('arcade');assert.equal(useGame.getState().room.view,'arcade');
  for(let i=0;i<70;i++)useGame.getState().tickVisitors(.1);
  useGame.getState().roomView('console');useGame.getState().roomView('arcade');
  assert.equal(useGame.getState().room.view,'arcade');
  for(let i=0;i<90;i++)useGame.getState().tickVisitors(.1);
  assert.equal(useGame.getState().room.view,'console');
  assert.equal(useGame.getState().room.encounters.active.phase,'waiting');
  assert.ok(useGame.getState().room.night.elapsed>=29);
  useGame.getState().roomView('arcade');assert.equal(useGame.getState().room.view,'console');
  const before=useGame.getState().room.encounters.active.elapsed;
  useGame.getState().tickVisitors(.1);assert.ok(useGame.getState().room.encounters.active.elapsed>before);
  useGame.getState().lobby();assert.equal(useGame.getState().arcade,null);
});
test('larger tablet joystick preserves full speed and proportional dead zones',async()=>{
  const {joystick}=await import(await moduleUrl(resolve('lib/deader/input.ts')));
  for(const radius of [32,40,56]){
    assert.deepEqual(joystick(radius,0,radius),{x:1,z:0});
    assert.deepEqual(joystick(radius*.1,0,radius),{x:0,z:0});
    assert.ok(Math.abs(joystick(radius*.5,0,radius).x-(.5-.15)/.85)<1e-9);
  }
});

const judgementLogic=await import(await moduleUrl(resolve('lib/deader/judgement.ts')));
test('judgement threshold, ammunition and frame gaps are pure and bounded',()=>{
  for(const mistakes of [0,1,2,3,10])assert.equal(judgementLogic.beginJudgement(mistakes).failed,mistakes>=3);
  const j=judgementLogic.beginJudgement(3);
  assert.equal(judgementLogic.tickJudgement(j,NaN),j);
  assert.equal(judgementLogic.tickJudgement(j,100).elapsed,.25);
  const unloaded=judgementLogic.freshWeapon();assert.equal(judgementLogic.spendShot(unloaded),unloaded);
  let w={...unloaded,collected:true};
  for(let i=0;i<6;i++){w=judgementLogic.spendShot({...w,cooldown:0});assert.equal(w.ammo,5-i);assert.equal(judgementLogic.spendShot(w),w);}
  assert.equal(judgementLogic.spendShot({...w,cooldown:0}).ammo,0);
});
async function combatStore(visitor='three'){
  const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
  globalThis.document={pointerLockElement:null};
  const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
  const r=room.freshRoom('combat',300);
  r.encounters=waiting(visitor);r.visitorId=r.encounters.active.id;r.door='OPEN';r.weapon.collected=true;
  useGame.setState({scene:'room',tutorial:null,panel:null,suspension:null,focused:true,save:g.newSave(),room:r,session:g.createSession('easy','normal')});
  return {useGame,memory};
}
test('shooting resolves an Anomaly once, pays visibly and persists after refresh',async()=>{
  const {useGame,memory}=await combatStore();const id=useGame.getState().room.encounters.active.id;
  assert.equal(useGame.getState().fireWeapon(id),true);
  const s=useGame.getState();assert.equal(s.room.weapon.ammo,5);assert.equal(s.room.encounters.active,null);
  assert.equal(s.save.coins,155);assert.equal(s.room.rewardToast.coins,5);assert.equal(s.room.encounters.correct,1);
  assert.equal(s.fireWeapon(id),false);assert.equal(useGame.getState().save.coins,155);
  s.tickVisitors(.25);s.tickVisitors(.25);useGame.getState().fireWeapon(id);assert.equal(useGame.getState().save.coins,155);
  assert.equal(g.readSave(memory.values().next().value).coins,155);
  useGame.getState().hydrate();assert.equal(useGame.getState().save.coins,155);
});
test('gun guards views, pause, door, misses and spent ammunition',async()=>{
  const {useGame}=await combatStore();const id=useGame.getState().room.encounters.active.id;
  for(const view of ['inspect','cctv','tv','arcade','console','door']){
    useGame.setState({room:{...useGame.getState().room,view}});assert.equal(useGame.getState().fireWeapon(id),false);
  }
  useGame.setState({room:{...useGame.getState().room,view:'explore',door:'CLOSED'},panel:'pause'});
  assert.equal(useGame.getState().fireWeapon(id),false);
  useGame.setState({panel:null});assert.equal(useGame.getState().fireWeapon(id),true);
  assert.equal(useGame.getState().room.encounters.active.id,id);assert.equal(useGame.getState().save.coins,150);
  for(let i=0;i<5;i++){useGame.getState().tickVisitors(.25);useGame.getState().tickVisitors(.25);assert.equal(useGame.getState().fireWeapon(null),true);}
  assert.equal(useGame.getState().room.weapon.ammo,0);assert.equal(useGame.getState().fireWeapon(id),false);
});
test('shooting humans adds mistakes and admitted residents cannot pay twice or erase mistakes',async()=>{
  const {useGame}=await combatStore('bea');const id=useGame.getState().room.encounters.active.id;
  useGame.getState().fireWeapon(id);assert.equal(useGame.getState().room.encounters.mistakes,1);assert.equal(useGame.getState().save.coins,150);
  for(const visitor of ['bea','three']){
    await combatStore(visitor);const id=useGame.getState().room.encounters.active.id;
    useGame.setState({room:{...useGame.getState().room,view:'door',door:'VISITOR_WAITING'}});
    useGame.getState().decideVisitor(id,'admit');
    const earned=useGame.getState().save.coins;
    useGame.getState().doorEvent({type:'opened'});
    for(let i=0;i<20;i++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.residents.length,1);
    assert.equal(useGame.getState().fireWeapon(id),true);
    assert.equal(useGame.getState().room.residents.length,0);
    assert.equal(useGame.getState().save.coins,earned);
    assert.equal(useGame.getState().room.encounters.mistakes,1);
    useGame.getState().tickVisitors(.25);useGame.getState().tickVisitors(.25);useGame.getState().fireWeapon(id);
    assert.equal(useGame.getState().room.encounters.mistakes,1);
  }
});
test('dawn judgement freezes controls and rewards, pauses safely and resolves once',async()=>{
  for(const mistakes of [2,3,8]){
    const {useGame}=await combatStore();const r=useGame.getState().room;
    useGame.setState({room:{...r,night:{...r.night,elapsed:599.9},encounters:{...r.encounters,mistakes,trust:Math.max(0,3-mistakes)}}});
    useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.night.status,'judging');assert.equal(useGame.getState().save.coins,150);
    assert.equal(useGame.getState().fireWeapon(null),false);
    const before=useGame.getState().room;useGame.setState({panel:'pause'});useGame.getState().tickVisitors(5);assert.equal(useGame.getState().room,before);
    useGame.setState({panel:null});
    for(let i=0;i<24;i++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.night.status,mistakes<3?'completed':'failed');
    assert.equal(useGame.getState().save.coins,mistakes<3?200:150);
    const save=useGame.getState().save;useGame.getState().tickVisitors(.25);assert.equal(useGame.getState().save,save);
  }
});
test('Infinite resets per-shift mistakes and ammunition, but retains cumulative records',async()=>{
  const {useGame}=await combatStore();const r=useGame.getState().room;
  useGame.setState({room:{...r,night:{...r.night,mode:'infinite',elapsed:599.9},encounters:{...r.encounters,mistakes:2},weapon:{...r.weapon,ammo:1}}});
  for(let i=0;i<25;i++)useGame.getState().tickVisitors(.25);
  const next=useGame.getState().room;assert.equal(next.night.number,2);assert.equal(next.mistakeBaseline,2);assert.equal(next.weapon.ammo,6);assert.equal(next.encounters.mistakes,2);
  useGame.setState({room:{...next,night:{...next.night,elapsed:1199.9},encounters:{...next.encounters,mistakes:5}}});
  for(let i=0;i<25;i++)useGame.getState().tickVisitors(.25);
  assert.equal(useGame.getState().room.night.status,'failed');assert.equal(useGame.getState().save.infiniteRecords.totalNights,1);
});
test('opening to aim preserves the deadline and can be cancelled or answered',async()=>{
 const {useGame}=await combatStore('bea');let r=useGame.getState().room;
 useGame.setState({room:{...r,door:'VISITOR_WAITING',view:'door'}});
 useGame.getState().aimDoor();assert.equal(useGame.getState().room.door,'OPENING');
 useGame.getState().doorEvent({type:'opened'});useGame.getState().tickVisitors(.25);
 assert.equal(useGame.getState().room.encounters.active.elapsed,.25);
 useGame.getState().doorEvent({type:'close'});useGame.getState().doorEvent({type:'closed'});
 assert.equal(useGame.getState().room.door,'VISITOR_WAITING');assert.equal(useGame.getState().room.encounters.mistakes,0);
 useGame.getState().roomView('door');useGame.getState().aimDoor();useGame.getState().doorEvent({type:'opened'});useGame.getState().roomView('door');
 r=useGame.getState().room;assert.equal(room.canConfirmDoor(r,r.encounters.active.id),true);
 useGame.getState().decideVisitor(r.encounters.active.id,'admit');assert.equal(useGame.getState().save.coins,155);
});

test('all early mistakes remain playable and never start a jumpscare',async()=>{
  for(const [visitor,decision] of [['three','admit'],['bea','reject']]){
    const {useGame}=await combatStore(visitor);
    const r=useGame.getState().room,id=r.encounters.active.id;
    useGame.setState({room:{...r,view:'door',door:'VISITOR_WAITING',encounters:{...r.encounters,mistakes:2,trust:1}}});
    useGame.getState().decideVisitor(id,decision);
    assert.equal(useGame.getState().room.encounters.mistakes,3);
    assert.equal(useGame.getState().room.judgement,null);
    if(decision==='admit')useGame.getState().doorEvent({type:'opened'});
    for(let i=0;i<80;i++){
      useGame.getState().tickVisitors(.25);
      assert.equal(useGame.getState().room.survival.phase,'idle');
      assert.equal(useGame.getState().room.night.status,'running');
    }
    useGame.getState().roomView('cctv');assert.equal(useGame.getState().room.view,'cctv');
    const latest=useGame.getState().room;
    useGame.setState({room:{...latest,night:{...latest.night,elapsed:599.9}}});
    useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.judgement.failed,true);
  }
});


test('returning the gun requires the shelf and preserves spent ammunition',async()=>{
 const {useGame}=await combatStore();
 useGame.getState().fireWeapon(null);
 useGame.setState({prompt:null});useGame.getState().returnWeapon();
 assert.equal(useGame.getState().room.weapon.collected,true);
 useGame.setState({prompt:'Put gun back'});useGame.getState().returnWeapon();
 assert.equal(useGame.getState().room.weapon.collected,false);
 assert.equal(useGame.getState().fireWeapon(null),false);
 useGame.setState({prompt:'Take gun'});useGame.getState().collectWeapon();
 assert.equal(useGame.getState().room.weapon.collected,true);
 assert.equal(useGame.getState().room.weapon.ammo,5);
});
test('night three empty-door check closes and permits another arrival',async()=>{
 const {useGame}=await combatStore();const r=useGame.getState().room;
 useGame.setState({room:{...r,night:{...r.night,number:3},view:'door',door:'CLOSED',visitorId:null,encounters:{...r.encounters,active:null}}});
 useGame.getState().doorEvent({type:'open-confirmed'});
 assert.equal(useGame.getState().room.door,'OPENING');
 useGame.getState().doorEvent({type:'opened'});
 assert.equal(useGame.getState().room.door,'CLOSING');
 useGame.getState().doorEvent({type:'closed'});
 assert.equal(useGame.getState().room.door,'CLOSED');
 useGame.getState().doorEvent({type:'arrival',id:'next-visitor'});
 assert.equal(useGame.getState().room.visitorId,'next-visitor');
 assert.equal(useGame.getState().room.door,'VISITOR_WAITING');
});
