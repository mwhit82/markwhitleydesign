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
      assert.ok(v.appearance === "ordinary" || v.appearance === "kids");
      assert.equal(v.movement, "natural");
      assert.equal(v.clues.length, 0);
    } else if(v.behaviour!=="mimic") assert.ok(v.clues.length > 0);
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
  const ids=Array.from({length:visitors.VISITORS.length*10},(_,i)=>nightLogic.shuffledVisitor(e.runId,i));
  for(let i=0;i<ids.length;i+=visitors.VISITORS.length)assert.equal(new Set(ids.slice(i,i+visitors.VISITORS.length)).size,visitors.VISITORS.length);
  for(let i=1;i<ids.length;i++)assert.notEqual(ids[i],ids[i-1]);
  assert.deepEqual(ids,Array.from({length:visitors.VISITORS.length*10},(_,i)=>nightLogic.shuffledVisitor(e.runId,i)));
  assert.notDeepEqual(ids,Array.from({length:visitors.VISITORS.length*10},(_,i)=>nightLogic.shuffledVisitor("different-run",i)));
  assert.equal(nightLogic.scheduledVisitor({...n,elapsed:12},e),nightLogic.arrivalPlan(n,e).visitor);
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
  for (let i = 0; i < 1232; i++) {
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
  assert.equal(s.room.encounters.correct+(s.room.encounters.stairsLost??0), 10);
  assert.equal(s.room.encounters.trust, 3);
  assert.equal(s.save.coins, 250-5*(s.room.encounters.stairsLost??0));
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
  assert.equal(useGame.getState().save.coins, s.save.coins);
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
    for(let i=0;i<31;i++)useGame.getState().tickVisitors(.25);
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
  for(let i=0;i<31;i++)useGame.getState().tickVisitors(.25);
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
  for (let i = 0; i < 31; i++) useGame.getState().tickVisitors(0.25);
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
        if (v.kind === "anomaly" && v.behaviour!=="mimic") assert.ok(v.clues.length);
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
    for(let i=0;i<31;i++)useGame.getState().tickVisitors(.25);
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
  for(let i=0;i<31;i++)useGame.getState().tickVisitors(.25);
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
        useGame.getState().room.encounters.correct+(useGame.getState().room.encounters.stairsLost??0),
        expected,
        `${number} ${difficulty}`,
      );
      assert.equal(useGame.getState().save.coins, 200 + 5 * (expected-(useGame.getState().room.encounters.stairsLost??0)));
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
  assert.equal(migrated.version, 3);
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
    for(let i=0;i<31;i++)useGame.getState().tickVisitors(.25);
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
  const previous = globalThis.AudioContext,previousFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  let contexts = 0,
    closed = 0;
  const bufferLengths=[];
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
    async decodeAudioData(){return {duration:3};}
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
    createBuffer(_channels,length) {
      bufferLengths.push(length);
      return { getChannelData: () => new Float32Array(length) };
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
    await a.preloadScream();a.dawnScream();assert.equal(a.diagnostics().voices,1);
    a.dawnScream();assert.equal(a.diagnostics().voices,1);
    a.stopDawnScream();assert.equal(a.diagnostics().voices,0);
    a.muted = true;
    a.dawnScream();
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
    globalThis.fetch=async()=>{throw new Error("offline");};
    a.unlock();await a.preloadScream();a.dawnScream();
    assert.equal(a.diagnostics().voices,0);
    assert.equal(contexts, 2);
    a.dispose();
  } finally {
    globalThis.AudioContext = previous;globalThis.fetch=previousFetch;
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
  assert.equal(JSON.parse(data).version, 3);
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
  for(let i=0;i<110;i++)useGame.getState().tickVisitors(.1);
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
    for(let i=0;i<31;i++)useGame.getState().tickVisitors(.25);
    assert.equal(useGame.getState().room.night.status,mistakes<3?'completed':'failed');
    assert.equal(useGame.getState().save.coins,mistakes<3?200:150);
    const save=useGame.getState().save;useGame.getState().tickVisitors(.25);assert.equal(useGame.getState().save,save);
  }
});
test('Infinite resets per-shift mistakes and ammunition, but retains cumulative records',async()=>{
  const {useGame}=await combatStore();const r=useGame.getState().room;
  useGame.setState({room:{...r,night:{...r.night,mode:'infinite',elapsed:599.9},encounters:{...r.encounters,mistakes:2},weapon:{...r.weapon,ammo:1}}});
  for(let i=0;i<32;i++)useGame.getState().tickVisitors(.25);
  const next=useGame.getState().room;assert.equal(next.night.number,2);assert.equal(next.mistakeBaseline,2);assert.equal(next.weapon.ammo,6);assert.equal(next.encounters.mistakes,2);
  useGame.setState({room:{...next,night:{...next.night,elapsed:1199.9},encounters:{...next.encounters,mistakes:5}}});
  for(let i=0;i<32;i++)useGame.getState().tickVisitors(.25);
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

test('generated identities are stable, varied and coherent without appearance denials',()=>{
 const profiles=Array.from({length:24},(_,i)=>visitors.generatedVisitor('three',719,i));
 assert.equal(new Set(profiles.map(v=>v.name)).size,24);
 assert.equal(visitors.STORIES.length,12);
 for(const [i,v] of profiles.entries()){
  assert.deepEqual(v,visitors.generatedVisitor('three',719,i));
  assert.ok(v.dialogue.identity.includes(v.name));assert.ok(!JSON.stringify(v.dialogue).includes('Two eyes'));
  assert.equal(v.clues.some(c=>c.source==='dialogue'),false);
 }
 const echo=visitors.generatedVisitor('echo',719,0);assert.match(echo.dialogue.origin,/all evening/);assert.match(echo.dialogue.purpose,/roof/);
});
test('special decision policies pay once, and kids are not shooting targets',()=>{
 for(const id of ['mimic','kids'])for(const decision of ['admit','reject']){
  const s=waiting(id),next=visitors.resolveEncounter(s,s.active.id,decision);
  assert.equal(next.earned,5);assert.equal(next.mistakes,0);if(id==='mimic')assert.equal(next.result.kind,'human');
  assert.equal(visitors.resolveEncounter(next,s.active.id,decision),next);
 }
 const m=waiting('mimic'),k=waiting('kids');
 assert.equal(visitors.resolveEncounter(m,m.active.id,'shoot').earned,0);
 assert.equal(visitors.resolveEncounter(m,m.active.id,'shoot').mistakes,0);
 assert.equal(visitors.resolveEncounter(k,k.active.id,'shoot').mistakes,1);
 assert.deepEqual(visitors.visitorById('mimic').clues,[]);
});
test('Mimic progresses on three distinct later outcomes, removes one resident and leaves',async()=>{
 const l=await import(await moduleUrl(resolve('lib/deader/lounge.ts')));
 let residents=l.admitResident([], 'm','mimic',visitors.generatedVisitor('mimic',4,0));
 residents=l.admitResident(residents,'h','bea');residents=residents.map(r=>({...r,phase:'seated'}));
 assert.deepEqual(l.advanceMimics(residents,'m'),residents);
 residents=l.advanceMimics(residents,'one');assert.equal(residents[0].mimicStage,1);
 assert.deepEqual(l.advanceMimics(residents,'one'),residents);
 residents=l.advanceMimics(residents,'two');assert.equal(residents[0].mimicStage,2);
 residents=l.advanceMimics(residents,'timeout');assert.equal(residents[0].mimicStage,3);assert.equal(residents[0].victim,'h');
 assert.equal(l.loungeAlert(residents).seconds,15);
 for(let i=0;i<40;i++)residents=l.tickResidents(residents,.25);
 assert.equal(residents.length,2);assert.equal(l.loungeAlert(residents).seconds,5);
 for(let i=0;i<44;i++)residents=l.tickResidents(residents,.25);
 assert.deepEqual(residents,[]);
 let alone=l.admitResident([],'alone','mimic');for(const id of ['1','2','3'])alone=l.advanceMimics(alone,id);
 assert.equal(alone[0].victim,null);assert.deepEqual(l.cancelMimics(alone),[]);assert.equal(l.loungeAlert(l.cancelMimics(alone)),null);
});
test('pair queue waits for the door, and a staircase victim incurs no decision or reward',()=>{
 for(const push of [false,true]){
  let e=visitors.tickEncounters(visitors.freshEncounters('pair'),.25,'easy',false,true,{scheduled:push?'mean':'bea',companion:'pippa',push});
  assert.equal(e.sequence,2);assert.ok(e.queued);assert.equal(e.queued.elapsed,0);
  for(let i=0;i<80;i++)e=visitors.tickEncounters(e,.25,'easy',false,true);
  assert.equal(e.active.phase,'waiting');assert.equal(e.queued.elapsed,0);
  e=visitors.resolveEncounter(e,e.active.id,push?'reject':'admit');
  for(let i=0;i<16;i++)e=visitors.tickEncounters(e,.25,'easy',false,false);
  assert.equal(e.active,null);assert.ok(e.queued);
  e=visitors.tickEncounters(e,.25,'easy',false,true);
  if(push){assert.equal(e.active,null);assert.equal(e.queued,null);assert.equal(e.stairsLost,1);}
  else{assert.equal(e.active.visitor,'pippa');assert.equal(e.active.phase,'approaching');}
  assert.equal(e.mistakes,0);assert.equal(e.earned,5);
 }
});
test('schedule reserves one early Mimic and bounds paired visitor budgets',()=>{
 let pairs=0,pushes=0;
 for(let seed=0;seed<500;seed++){
  const n=nightLogic.freshNight(),e=visitors.freshEncounters('seed-'+seed);let index=0,mimics=0,last='';
  while(index<10){e.sequence=index;const p=nightLogic.arrivalPlan(n,e);assert.notEqual(p.visitor,last);
   if(p.visitor==='mimic'){mimics++;assert.ok(index<=6);} if(p.companion==='mimic'){mimics++;assert.ok(index+1<=6);}
   if(p.companion)pairs++;if(p.push)pushes++;
   index+=p.companion?2:1;last=p.push?p.visitor:p.companion??p.visitor;
  }
  assert.equal(index,10);assert.equal(mimics,1);e.sequence=index;
  assert.equal(nightLogic.scheduledVisitor({...n,elapsed:550},e),null);
 }
 assert.ok(pairs>300);assert.ok(pushes>20&&pushes<pairs/3);
});
test('bundle purchases migrate and persist, with independent equipment and no duplicate charge',async()=>{
 const c=await import(await moduleUrl(resolve('lib/deader/cosmetics.ts')));
 const old={...g.newSave(),version:2,coins:300};delete old.ownedBundles;
 let s=g.readSave(JSON.stringify(old));assert.equal(s.version,3);assert.equal(s.coins,300);
 assert.equal(c.equipBundle(s,'rainbow'),s);
 s=c.purchaseBundle(s,'rainbow');assert.equal(s.coins,150);assert.equal(s.ownedAccessories.length,4);
 assert.equal(c.purchaseBundle(s,'rainbow'),s);s=c.equipBundle(s,'rainbow');assert.equal(s.outfit.finish,'rainbow-finish');
 s=c.purchaseBundle(s,'injured');s=c.equipAccessory(s,'face','dangling-eye');assert.equal(s.outfit.finish,'rainbow-finish');
 assert.deepEqual(g.readSave(JSON.stringify(s)),s);assert.equal(c.purchaseBundle({...g.newSave(),coins:149},'injured').coins,149);
});
test('new anomaly tells recur within every decision window and reduced motion holds the clue',()=>{
 for(let seed=0;seed<24;seed++){
  assert.ok(Array.from({length:80},(_,i)=>visitors.anomalyTell(i/10,seed)).some(v=>v>.5));
  for(let start=8;start<25;start+=8)assert.ok(Array.from({length:80},(_,i)=>visitors.anomalyTell(start+i/10,seed)).some(v=>v>.5));
  assert.equal(visitors.anomalyTell(0,seed,true),1);
 }
});
test('Mimic store integration advances on timeouts and shooting cancels without penalties',async()=>{
 const l=await import(await moduleUrl(resolve('lib/deader/lounge.ts')));
 const {useGame}=await combatStore('bea');let r=useGame.getState().room;
 const resident={...l.admitResident([],'m','mimic')[0],phase:'seated',mimicStage:0};
 useGame.setState({room:{...r,residents:[resident],encounters:{...r.encounters,active:{...r.encounters.active,elapsed:59.9}}}});
 useGame.getState().tickVisitors(.25);
 assert.equal(useGame.getState().room.residents[0].mimicStage,1);
 r=useGame.getState().room;const mistakes=r.encounters.mistakes,coins=useGame.getState().save.coins;
 assert.equal(useGame.getState().fireWeapon('m'),true);
 assert.equal(useGame.getState().room.residents.length,0);
 assert.equal(useGame.getState().room.encounters.mistakes,mistakes);assert.equal(useGame.getState().save.coins,coins);
});
test('owning every bundle piece prevents a duplicate bundle charge',async()=>{
 const c=await import(await moduleUrl(resolve('lib/deader/cosmetics.ts')));
 const s={...g.newSave(),ownedAccessories:[...c.bundles[0].items]};
 assert.equal(c.purchaseBundle(s,'rainbow'),s);
 assert.equal(c.equipBundle(s,'rainbow').outfit.finish,'rainbow-finish');
});

test('dawn close-up lasts three seconds and respects motion settings',()=>{
 const j=judgementLogic;
 assert.equal(j.JUDGEMENT_SECONDS,7.6);
 assert.equal(j.dawnScarePose(3.59,false,false).active,false);
 assert.equal(j.dawnScarePose(3.6,false,false).active,true);
 assert.equal(j.dawnScarePose(6.59,false,false).active,true);
 assert.equal(j.dawnScarePose(6.6,false,false).active,false);
 for(const gentle of [true,false]){const p=j.dawnScarePose(4.5,gentle,true);assert.equal(p.roll,0);assert.equal(p.x,0);assert.equal(p.y,0);}
 assert.equal(j.dawnScarePose(4.5,true,false).distance,1.5);
 assert.ok(Math.abs(j.dawnScarePose(4.5,false,false).roll)>0);
});

test('Injured cone removes material from both upper bites and keeps outward normals',async()=>{
 const {createBittenConeGeometry}=await import(await moduleUrl(resolve('components/deader/bitten-cone.ts')));
 const geometry=createBittenConeGeometry(),p=geometry.attributes.position,n=geometry.attributes.normal;
 for(const y of [1.19,1.405]){
  const xs=[];for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-y)<.008)xs.push(p.getX(i));
  assert.ok(xs.length>0);assert.ok(Math.max(...xs)<(y<1.3?.11:.045));
 }
 let front=-1;for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(n.getX(i)));if(p.getZ(i)>.4&&p.getY(i)>.4)front=i;}
 assert.ok(front>=0);assert.ok(n.getZ(front)>0);geometry.dispose();
});

test('lounge alert persists through departure and clears when the Mimic is gone',async()=>{
 const l=await import(await moduleUrl(resolve('lib/deader/lounge.ts')));
 let residents=[{id:'m',visitor:'mimic',seat:0,phase:'seated',elapsed:8,mimicStage:3,attackSeconds:14.9,victim:null}];
 residents=l.tickResidents(residents,.25);
 assert.equal(l.loungeAlert(residents).leaving,true);assert.equal(l.loungeAlert(residents).seconds,5);
 for(let i=0;i<20;i++)residents=l.tickResidents(residents,.25);
 assert.equal(l.loungeAlert(residents),null);
});

const vr = await import(await moduleUrl(resolve('lib/deader/vr.ts')));
test('VR defaults preserve smooth walking and smooth turning through old saves',()=>{
 for(const version of [1,2,3]){const save=g.readSave(JSON.stringify({...g.newSave(),version,settings:{volume:.4}}));assert.deepEqual(save.settings.vr,vr.defaultVRSettings());assert.equal(save.coins,150);assert.equal(save.settings.volume,.4);}
 const settings=vr.readVRSettings({walkSpeed:100,turnSpeed:-5,leftHanded:true,movement:'teleport',turning:'snap',seated:true});
 assert.equal(settings.walkSpeed,2);assert.equal(settings.turnSpeed,15);assert.equal(settings.leftHanded,true);assert.equal(settings.movement,'teleport');
 assert.equal(vr.readVRSettings({walkSpeed:NaN}).walkSpeed,1.5);
 const save=g.newSave();save.settings.vr=settings;assert.deepEqual(g.readSave(JSON.stringify(save)).settings.vr,settings);
});
test('VR thumbsticks have a radial dead zone and bounded diagonal movement',()=>{
 assert.deepEqual(vr.vrAxes(.1,.1),{x:0,z:0});assert.deepEqual(vr.vrAxes(NaN,1),{x:0,z:0});
 assert.equal(Math.hypot(...Object.values(vr.vrAxes(1,1))),1);assert.ok(Math.abs(vr.vrAxes(.6,0).x-.5)<1e-9);
 assert.equal(vr.vrDelta(5),.05);assert.equal(vr.vrDelta(-1),0);assert.equal(vr.vrDelta(NaN),0);
});
test('VR turns around the actual head instead of orbiting around the room origin',()=>{
 const origin={x:2,z:3},head={x:2.4,z:3.2};const result=vr.rotateOrigin(origin,head,Math.PI/2);
 assert.ok(Math.abs(Math.hypot(result.x-head.x,result.z-head.z)-Math.hypot(origin.x-head.x,origin.z-head.z))<1e-9);
 assert.deepEqual(vr.rotateOrigin(head,head,Math.PI),head);
 const round=vr.rotateOrigin(result,head,-Math.PI/2);assert.ok(Math.abs(round.x-origin.x)<1e-9&&Math.abs(round.z-origin.z)<1e-9);
});
test('VR teleport checks the whole path, door partition and furniture',()=>{
 const valid=p=>vr.validVRFloor(p,'room',g.ROOM_CLOSED_OBSTACLES);
 assert.equal(vr.validVRTeleport({x:0,z:2},{x:0,z:5},valid),true);
 assert.equal(vr.validVRTeleport({x:2,z:2},{x:2,z:5},valid),false);
 assert.equal(vr.validVRTeleport({x:0,z:0},{x:2.8,z:-.4},valid),false);
 assert.equal(vr.validVRTeleport({x:0,z:0},{x:0,z:-4},valid),false);
 assert.equal(vr.validVRTeleport({x:0,z:0},{x:0,z:7},valid),false);
 assert.equal(vr.validVRFloor({x:NaN,z:0},'lobby',[]),false);
});

 test('VR entry is limited to Quest Browser, including its desktop mode',()=>{
 for(const platform of ['Linux; Android 12; Quest 3','X11; Linux x86_64; Quest Pro'])
  assert.equal(vr.isQuestBrowser(`Mozilla/5.0 (${platform}) OculusBrowser/39.2.0 Chrome/140.0 VR Safari/537.36`),true);
 for(const ua of ['', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1 Safari/604.1', 'Mozilla/5.0 (Linux; Android 14) Chrome/140.0 Mobile Safari/537.36', 'Mozilla/5.0 (Macintosh) Chrome/140.0 Safari/537.36', 'Quest 3 Wolvic/1.0'])
  assert.equal(vr.isQuestBrowser(ua),false);
 });

test('VR screen model has focused pages and independent shop purchase/equip actions',async()=>{
 const {vrScreen,newVRMenu}=await import(await moduleUrl(resolve('lib/deader/vr-menu.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const actions={patch:()=>{},resume:()=>{},recenter:()=>{},exit:()=>{},decide:()=>{}};
 for(const panel of ['shop','wardrobe','start','pause','progress','tutorial']){
  const m=newVRMenu(),s={...useGame.getState(),panel,save:g.newSave(),suspension:null};
  const view=vrScreen(s,m,actions);assert.ok(view.buttons.length<=4);assert.ok(view.close);
 }
 let bought=0,equipped=0;const s={...useGame.getState(),panel:'shop',save:g.newSave(),suspension:null,buyBundle:()=>bought++,wearBundle:()=>equipped++};
 const m={...newVRMenu(),page:'shop-bundle'};let view=vrScreen(s,m,actions);
 assert.equal(view.buttons.find(b=>b.text==='Purchase').disabled,false);
 assert.equal(view.buttons.find(b=>b.text==='Equip set').disabled,true);
 view.buttons.find(b=>b.text==='Purchase').run();assert.equal(bought,1);assert.equal(equipped,0);
 s.save.coins=149;view=vrScreen(s,m,actions);assert.equal(view.buttons.find(b=>b.text==='Purchase').disabled,true);
});
test('VR confirmations expire with encounter identity and CCTV keeps decisions visible',async()=>{
 const {vrScreen,newVRMenu}=await import(await moduleUrl(resolve('lib/deader/vr-menu.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const s={...useGame.getState(),panel:null,suspension:null,room:{...useGame.getState().room,night:null,view:'cctv',survival:{phase:'idle'},encounters:{active:{id:'a',visitor:'bea',phase:'waiting',elapsed:3,asked:[]}}}};
 const actions={patch:()=>{},resume:()=>{},recenter:()=>{},exit:()=>{},decide:()=>{}},m=newVRMenu();
 let view=vrScreen(s,m,actions);assert.equal(view.feed,true);assert.equal(view.buttons.length,4);view.buttons.find(b=>b.text==='Let in').run();assert.equal(m.confirmation.id,'a');
 view=vrScreen(s,m,actions);assert.ok(view.buttons.some(b=>b.text==='Confirm'));
 s.room.encounters.active={...s.room.encounters.active,id:'b'};view=vrScreen(s,m,actions);assert.equal(m.confirmation,null);assert.ok(view.buttons.some(b=>b.text==='Let in'));
});
test('VR decision bridge requires live headset and preserves desktop CCTV restrictions',async()=>{
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const {useVR}=await import(await moduleUrl(resolve('lib/deader/vr-state.ts')));
 const before=useGame.getState(),previous=useVR.getState().active;
 try{
  useGame.setState({panel:null,suspension:null,focused:true,tutorial:null,room:{...before.room,night:null,judgement:null,door:'VISITOR_WAITING',view:'cctv',survival:{phase:'idle'},encounters:{...before.room.encounters,active:{id:'vr-decision',visitor:'bea',phase:'waiting',elapsed:0,asked:[],decision:null}}}});
  let calls=0;useGame.setState({decideVisitor:()=>{calls++;}});
  useVR.setState({active:false});useGame.getState().decideVisitorVR('vr-decision','admit');assert.equal(calls,0);
  useVR.setState({active:true});useGame.getState().decideVisitorVR('wrong','admit');assert.equal(calls,0);
  useGame.getState().decideVisitorVR('vr-decision','admit');assert.equal(calls,1);assert.equal(useGame.getState().room.view,'door');
 }finally{useGame.setState(before);useVR.setState({active:previous});}
});
test('VR panel placement keeps full screen width in free space when available',()=>{
 const head={x:0,y:1.6,z:0};const p=vr.placeVRPanel(head,{x:0,z:-1},'lobby',[{x:0,z:-1.2,hx:2,hz:.3}]);
 assert.ok(Math.hypot(p.x,p.z)>=.59);assert.ok(Math.hypot(p.x,p.z)<=1.21);
 assert.equal(vr.validVRFloor(p,'lobby',[{x:0,z:-1.2,hx:2,hz:.3}]),true);
 assert.ok(p.y>=.65);assert.ok(vr.VR_MUZZLE[2]<0);
});
test('VR pistol reverses the GLB forward axis to match the firing muzzle',async()=>{
 const {readFile}=await import('node:fs/promises');const bytes=await readFile('public/deader/service-pistol.glb');
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const root=gltf.nodes.find(n=>n.name==='Worn service pistol');
 const THREE=await import('three');const forward=new THREE.Vector3(1,0,0).applyQuaternion(new THREE.Quaternion(...root.rotation)).applyAxisAngle(new THREE.Vector3(0,1,0),vr.VR_GUN_YAW);
 assert.ok(forward.z<-.99);assert.ok(Math.abs(forward.x)<.001);assert.ok(vr.VR_MUZZLE[2]<0);
});
test('VR hover and proximity never open or close menus',async()=>{
 const {vrPanelVisible}=await import(await moduleUrl(resolve('lib/deader/vr-interactions.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const s={...useGame.getState(),panel:null,suspension:null,tutorial:null,room:{...useGame.getState().room,view:'explore',judgement:null,night:null,survival:{phase:'idle'},residents:[{id:'alert',mimicStage:3}]}};
 for(let i=0;i<1000;i++){s.prompt=['Door','Shop','Take gun',null][i%4];assert.equal(vrPanelVisible(s),false);}
 s.room.view='inspect';for(const prompt of ['Take gun','Door',null]){s.prompt=prompt;assert.equal(vrPanelVisible(s),true);}
 s.room.view='explore';assert.equal(vrPanelVisible(s),false);
});
test('VR object activation is explicit and gun pickup has no intermediate screen',async()=>{
 const {activateVRTarget}=await import(await moduleUrl(resolve('lib/deader/vr-interactions.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const calls=[];const s={...useGame.getState(),scene:'room',panel:null,suspension:null,focused:true,room:{...useGame.getState().room,view:'explore',night:null,judgement:null,survival:{phase:'idle'}},collectWeapon:()=>calls.push('collect'),returnWeapon:()=>calls.push('return'),roomView:v=>calls.push(v),doorEvent:e=>calls.push(e.type)};
 activateVRTarget(s,'Take gun',()=>{});assert.deepEqual(calls,['collect']);
 activateVRTarget(s,'Put gun back',()=>{});assert.deepEqual(calls,['collect','return']);
 activateVRTarget(s,'Door',()=>{});assert.deepEqual(calls.slice(-2),['door','inspect']);
 activateVRTarget(s,'CCTV',()=>{});assert.equal(calls.at(-1),'cctv');assert.equal(calls.includes('console'),false);
 s.suspension='interrupted';const count=calls.length;assert.equal(activateVRTarget(s,'Door',()=>{}),false);assert.equal(calls.length,count);
});
test('VR door activation is restricted to handle descendants',async()=>{
 const {vrInteractionName}=await import(await moduleUrl(resolve('lib/deader/vr-interactions.ts')));
 const door={userData:{interaction:'Door',vrIgnoreInteraction:true},parent:null};
 assert.equal(vrInteractionName({userData:{},parent:door}),null);
 const handle={userData:{vrInteraction:'Door'},parent:door};
 assert.equal(vrInteractionName({userData:{},parent:handle}),'Door');
 assert.equal(vrInteractionName({userData:{},parent:{userData:{vrInteraction:'Shop'},parent:null}}),'Shop');
});
test('VR CCTV omits visitor choices when the landing is empty',async()=>{
 const {vrScreen,newVRMenu}=await import(await moduleUrl(resolve('lib/deader/vr-menu.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const s={...useGame.getState(),panel:null,suspension:null,tutorial:null,room:{...useGame.getState().room,view:'cctv',judgement:null,night:null,survival:{phase:'idle'},encounters:{active:null}}};
 const view=vrScreen(s,newVRMenu(),{patch:()=>{},resume:()=>{},recenter:()=>{},exit:()=>{},decide:()=>{}});
 assert.deepEqual(view.buttons.map(b=>b.text),['Change camera','Play Impossible Shift']);assert.equal(view.feed,true);
});
test('VR ray activation satisfies weapon guards and retains ammo on return',async()=>{
 const {activateVRTarget}=await import(await moduleUrl(resolve('lib/deader/vr-interactions.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 const before=useGame.getState();
 try{
  useGame.setState({scene:'room',panel:null,suspension:null,focused:true,tutorial:null,prompt:null,room:{...before.room,judgement:null,view:'explore',survival:{phase:'idle'},night:{...before.room.night,status:'running'},weapon:{...before.room.weapon,collected:false,ammo:4}}});
  activateVRTarget(useGame.getState(),'Take gun',p=>useGame.setState(p));assert.equal(useGame.getState().room.weapon.collected,true);assert.equal(useGame.getState().room.view,'explore');assert.equal(useGame.getState().prompt,null);
  activateVRTarget(useGame.getState(),'Put gun back',p=>useGame.setState(p));assert.equal(useGame.getState().room.weapon.collected,false);assert.equal(useGame.getState().room.weapon.ammo,4);
 }finally{useGame.setState(before);}
});

const vrFeed = await import(await moduleUrl(resolve("lib/deader/vr-feed.ts")));
test("VR feed restores renderer and object state on success and failure, and blocks recursive renders", async () => {
  const THREE = await import("three");
  const scene = new THREE.Scene(), ui = new THREE.Object3D(), mirror = new THREE.Object3D();
  ui.userData.vrUI = true; mirror.userData.auxiliarySurface = true;
  scene.add(ui, mirror);
  const original = { id: "xr-framebuffer" }, target = { id: "camera" };
  let active = original, face = 2, mip = 1, calls = 0;
  const viewport = new THREE.Vector4(1, 2, 3, 4), scissor = new THREE.Vector4(5, 6, 7, 8);
  let vp = viewport.clone(), sc = scissor.clone(), scTest = true;
  const gl = {
    xr: { enabled: true }, autoClear: false, shadowMap: { autoUpdate: true },
    getRenderTarget: () => active, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    getViewport: out => out.copy(vp), getScissor: out => out.copy(sc), getScissorTest: () => scTest,
    setViewport: v => { vp = v.clone(); }, setScissor: v => { sc = v.clone(); }, setScissorTest: v => { scTest = v; },
    setRenderTarget: (v, f = 0, m = 0) => { active = v; face = f; mip = m; }, clear: () => {},
    render: () => {
      calls++;
      assert.equal(ui.visible, false); assert.equal(mirror.visible, false);
      assert.equal(gl.xr.enabled, false);
      assert.equal(vrFeed.renderVRFeed(gl, scene, {}, target), false);
    },
  };
  const restored = () => {
    assert.equal(active, original); assert.equal(face, 2); assert.equal(mip, 1);
    assert.deepEqual(vp, viewport); assert.deepEqual(sc, scissor); assert.equal(scTest, true);
    assert.equal(gl.xr.enabled, true); assert.equal(gl.autoClear, false); assert.equal(gl.shadowMap.autoUpdate, true);
    assert.equal(ui.visible, true); assert.equal(mirror.visible, true); assert.equal(vrFeed.feedHealth.rendering, false);
  };
  vrFeed.retryVRFeed();
  assert.equal(vrFeed.renderVRFeed(gl, scene, {}, target), true); restored(); assert.equal(calls, 1);
  gl.render = () => { calls++; throw new Error("simulated render failure"); };
  const log = console.error; console.error = () => {};
  try { assert.equal(vrFeed.renderVRFeed(gl, scene, {}, target), false); } finally { console.error = log; }
  restored(); assert.equal(vrFeed.feedHealth.failed, true);
  assert.equal(vrFeed.renderVRFeed(gl, scene, {}, target), false); assert.equal(calls, 2);
  vrFeed.retryVRFeed(); assert.equal(vrFeed.feedHealth.failed, false);
});
test('VR camera failure retains retry and close without a live feed',async()=>{
 const {vrScreen,newVRMenu}=await import(await moduleUrl(resolve('lib/deader/vr-menu.ts')));
 const {useGame}=await import(await moduleUrl(resolve('lib/deader/store.ts')));
 let retried=false,closed=false;
 const s={...useGame.getState(),panel:null,suspension:null,roomView:v=>{closed=v==='explore';},room:{...useGame.getState().room,view:'cctv'}};
 const view=vrScreen(s,newVRMenu(),{feedFailed:true,retryFeed:()=>{retried=true;},patch:()=>{},resume:()=>{},recenter:()=>{},exit:()=>{},decide:()=>{}});
 assert.equal(view.title,'Camera unavailable');assert.equal(view.feed,undefined);
 view.buttons[0].run();view.close();assert.equal(retried,true);assert.equal(closed,true);
});

test('simulation has one owner and XR ignores flat-tab visibility', async()=>{
 const {simulationActive}=await import(await moduleUrl(resolve('lib/deader/simulation.ts')));
 for(const xr of [false,true]){
  assert.equal(Number(simulationActive('page',xr,true))+Number(simulationActive('xr',xr,true)),1);
  assert.equal(simulationActive('page',xr,false),false);
  assert.equal(simulationActive('xr',xr,false),false);
 }
 assert.equal(simulationActive('xr',true,true),true);
});
test('shared night clock holds dawn and resets only at Infinite rollover',async()=>{
 const {nightClockLabel}=await import(await moduleUrl(resolve('lib/deader/night.ts')));
 assert.equal(nightClockLabel(null),'12:00 AM');
 assert.equal(nightClockLabel({elapsed:600,mode:'normal',number:3}),'5:55 AM');
 assert.equal(nightClockLabel({elapsed:600,mode:'infinite',number:1}),'5:55 AM');
 assert.equal(nightClockLabel({elapsed:600,mode:'infinite',number:2}),'12:00 AM');
 assert.equal(nightClockLabel({elapsed:1200,mode:'infinite',number:2}),'5:55 AM');
});
test('every Normal dawn resolves from each room view and exposes VR results once',async()=>{
 const {vrScreen,newVRMenu}=await import(await moduleUrl(resolve('lib/deader/vr-menu.ts')));
 const actions={patch:()=>{},resume:()=>{},recenter:()=>{},exit:()=>{},decide:()=>{}};
 for(const number of [1,2,3])for(const view of ['explore','inspect','cctv','arcade','tv'])for(const mistakes of [0,3]){
  const {useGame}=await combatStore();const r=useGame.getState().room;
  useGame.setState({room:{...r,view,night:{...r.night,number,elapsed:599.99},encounters:{...r.encounters,mistakes}}});
  for(let i=0;i<80;i++)useGame.getState().tickVisitors(.1);
  const s=useGame.getState();assert.equal(s.room.night.status,mistakes?'failed':'completed');assert.equal(s.room.view,'explore');assert.equal(s.room.judgement,null);
  const screen=vrScreen(s,newVRMenu(),actions);assert.equal(screen.title,mistakes?'Game Over':'Night complete');assert.ok(screen.buttons.some(b=>b.text===(mistakes?'Retry shift':'Replay night')));
  const save=s.save;useGame.getState().tickVisitors(.1);assert.equal(useGame.getState().save,save);
 }
});
