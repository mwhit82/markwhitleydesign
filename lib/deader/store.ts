"use client";
import { tutorialRoom, rewardsAllowed, type TutorialStep } from "./tutorial";
import { purchasePet, equipPet, type PetId } from "./pets";
import type { ArcadeState } from "./arcade";
import { rehearse, type Rehearsal } from "./rehearsal";
import { admitResident, tickResidents } from "./lounge";
import {
  unlockAchievements,
  claimAchievement,
  type AchievementId,
} from "./achievements";
import {
  purchaseAccessory,
  equipAccessory,
  type AccessoryId,
  type AccessoryCategory,
} from "./cosmetics";
import { create } from "zustand";
import { loopBroadcast } from "./tv";
import { gameInput } from "./input";
import {
  newSave,
  reward,
  type Decision,
  purchase,
  equip,
  createSession,
  type Save,
  type ColourId,
  type Difficulty,
  type GameMode,
  type Session,
} from "./game";
import {
  newsForNight,
  broadcastDuration,
  freshRoom,
  transitionDoor,
  type RoomState,
  type RoomView,
  type DoorEvent,
} from "./room";
import {
  arrivalInterval,
  tickEncounters,
  resolveEncounter,
  askQuestion,
  type Question,
} from "./visitors";
import {
  beginSurvival,
  tickSurvival,
  survivalBusy,
  readSettings,
  type Settings,
} from "./survival";
import {
  advanceNight,
  scheduledVisitor,
  completeNightReward,
  nightRate,
  infiniteInterval,
} from "./night";
import {
  unlockedNight,
  recordInfiniteNight,
  recordInfinite,
} from "./progression";
import { loadLocalSave, writeLocalSave } from "./persistence";
export { SAVE_KEY } from "./persistence";
export type Panel = "shop" | "wardrobe" | "start" | "pause" | "progress" | "tutorial" | null;
type State = {
  tutorial: TutorialStep | null;
  tutorialMessage: string | null;
  tutorialAdvance: (event: TutorialStep) => void;
  beginTutorial: () => void;
  interactLobby: () => void;
  arcade: ArcadeState | null;
  buyPet: (id: PetId) => void;
  wearPet: (id: PetId | null) => void;
  save: Save;
  ready: boolean;
  storageFailed: boolean;
  saveNotice: string | null;
  scene: "lobby" | "room";
  panel: Panel;
  room: RoomState;
  roomView: (view: RoomView) => void;
  doorEvent: (event: DoorEvent) => void;
  finishNews: () => void;
  tickVisitors: (delta: number) => void;
  askVisitor: (id: string, question: Question) => void;
  decideVisitor: (id: string, decision: Decision) => void;
  escape: () => void;
  focused: boolean;
  suspension: "interrupted" | null;
  touchActive: boolean;
  prompt: string | null;
  difficulty: Difficulty;
  mode: GameMode;
  selectedNight: number;
  nextNight: () => void;
  session: Session | null;
  rehearsal: Rehearsal;
  runSeconds: 300 | 60;
  hydrate: () => void;
  settings: (patch: Partial<Settings>) => void;
  buyAccessory: (id: AccessoryId) => void;
  wearAccessory: (category: AccessoryCategory, id: AccessoryId | null) => void;
  claim: (id: AchievementId) => void;
  buy: (id: ColourId) => void;
  wear: (id: ColourId) => void;
  open: (panel: Panel) => void;
  start: () => void;
  lobby: () => void;
};
function persist(save: Save) {
  try {
    return !writeLocalSave(localStorage, save);
  } catch {
    return true;
  }
}
export const useGame = create<State>((set, get) => ({
  tutorial: null, tutorialMessage: null, arcade: null,
  beginTutorial: () => { get().lobby(); set({ tutorial: "move" }); },
  tutorialAdvance: (event) => {
    const step=get().tutorial;
    const next: Partial<Record<TutorialStep,TutorialStep>>={move:"look",look:"tablet",inspect:"questions",questions:"camera",camera:"decide",tv:"finish"};
    if(step===event&&next[event]) set({tutorial:next[event],tutorialMessage:null});
  },
  interactLobby: () => {
    const s=get(); if(s.panel||s.suspension||!s.focused)return;
    if(s.prompt==="Learn to play") {
      if(s.tutorial==="tablet") { gameInput.reset(); set({scene:"room",panel:null,tutorial:"inspect",room:tutorialRoom(freshRoom(crypto.randomUUID())),session:createSession("easy","normal"),prompt:null}); }
      else s.open("tutorial");
    } else if(s.prompt==="Shop")s.open("shop");
    else if(s.prompt==="Customise")s.open("wardrobe");
    else if(s.prompt==="Start"&&!s.tutorial)s.open("start");
  },
  buyPet: id => {const save=purchasePet(get().save,id);set({save,storageFailed:persist(save)});},
  wearPet: id => {const save=equipPet(get().save,id);set({save,storageFailed:persist(save)});},
  save: newSave(),
  ready: false,
  storageFailed: false,
  saveNotice: null,
  scene: "lobby",
  panel: null,
  room: freshRoom(),
  focused: true,
  suspension: null,
  touchActive: false,
  prompt: null,
  difficulty: "easy",
  mode: "normal",
  selectedNight: 1,
  nextNight: () => {
    const s = get();
    if (
      s.room.night?.status !== "completed" ||
      s.room.night.mode !== "normal" ||
      s.room.night.number >= 3
    )
      return;
    set({ selectedNight: s.room.night.number + 1 });
    get().start();
  },
  session: null,
  rehearsal: "standard",
  runSeconds: 300,
  roomView: (view) => {
    gameInput.reset();
    if (view === "arcade" && ((get().room.encounters.active && get().room.encounters.active?.phase !== "approaching") || get().tutorial)) return;
    if (view === "tv") get().tutorialAdvance("tv");
    if (view === "news") view = "explore";
    if (
      survivalBusy(get().room.survival) ||
      get().room.night?.status === "completed"
    )
      return;
    if (typeof document !== "undefined" && document.pointerLockElement)
      document.exitPointerLock();
    const room =
      get().room.door === "INSPECTING"
        ? transitionDoor(get().room, { type: "leave-inspection" })
        : get().room;
    set({
      room: { ...room, view },
      prompt: null,
    });
  },
  doorEvent: (event) => {
    gameInput.reset();
    const s = get(),
      active = s.room.encounters.active;
    if (s.panel || (!s.focused || !!s.suspension) || s.room.night?.status === "completed") return;
    if (
      survivalBusy(s.room.survival) &&
      event.type !== "opened" &&
      event.type !== "closed"
    )
      return;
    if (event.type === "open-confirmed" || event.type === "reject") {
      if (active) {
        if (active.phase === "waiting")
          s.decideVisitor(
            active.id,
            event.type === "reject" ? "reject" : "admit",
          );
        return;
      }
    }
    if (active && (event.type === "lock" || event.type === "close")) return;
    if (event.type === "inspect") get().tutorialAdvance("inspect");
    const room = transitionDoor(get().room, event);
    if (room !== get().room) set({ room, prompt: null });
  },
  tickVisitors: (delta) => {
    let s = get();
    if (
      s.scene !== "room" ||
      s.panel ||
      (!s.focused || !!s.suspension) ||
      !Number.isFinite(delta) ||
      delta <= 0
    )
      return;
    if (s.tutorial) {
      const report=newsForNight(1);
      set({room:{...s.room,newsSeconds:loopBroadcast(s.room.newsSeconds,delta,broadcastDuration(report)),residents:tickResidents(s.room.residents,delta,s.room.door==="OPEN")}});
      return;
    }
    if (s.room.night?.status === "completed") {
      const n = s.room.night;
      if (n.number === 3 && n.endingSeconds < 14) {
        const endingSeconds = Math.min(
          14,
          n.endingSeconds + Math.min(delta, 0.25),
        );
        const save =
          endingSeconds === 14 && rewardsAllowed(s.tutorial,n.duration)
            ? { ...s.save, endingViewed: true }
            : s.save;
        set({
          save,
          storageFailed: save !== s.save ? persist(save) : s.storageFailed,
          room: { ...s.room, night: { ...n, endingSeconds } },
        });
      }
      return;
    }
    if (s.room.night) {
      const night = advanceNight(
        s.room.night,
        delta,
        survivalBusy(s.room.survival),
        s.room.encounters.trust,
      );
      if (night.status === "completed") {
        const completedSave = rewardsAllowed(s.tutorial, night.duration) ? completeNightReward(
          s.save,
          night,
          s.room.encounters.runId,
        ) : s.save;
        const save =
          rewardsAllowed(s.tutorial,night.duration)
            ? unlockAchievements(
                completedSave,
                s.room.encounters.mistakes === 0 &&
                  s.room.encounters.correct > 0,
              )
            : completedSave;
        set({
          save,
          storageFailed: save !== s.save ? persist(save) : s.storageFailed,
          prompt: null,
          arcade: null,
          room: {
            ...s.room,
            night: { ...night, cancelledVisitor: !!s.room.encounters.active },
            view: "explore",
            visitorId: null,
            door: ["OPEN", "OPENING"].includes(s.room.door)
              ? "CLOSING"
              : "CLOSED",
            encounters: { ...s.room.encounters, active: null },
          },
        });
        if (typeof document !== "undefined" && document.pointerLockElement)
          document.exitPointerLock();
        return;
      }
      if (night !== s.room.night) {
        let save =
          night.mode === "infinite" &&
          rewardsAllowed(s.tutorial,night.duration) &&
          (night.number !== s.room.night.number || night.status === "failed")
            ? recordInfinite(s.save, {
                streak: s.room.encounters.bestStreak,
                night: night.number,
                correct: s.room.encounters.correct,
                totalNights: Math.floor(night.elapsed / 600),
              })
            : s.save;
        if (
          night.mode === "infinite" &&
          rewardsAllowed(s.tutorial,night.duration) &&
          night.number > s.room.night.number
        )
          save = recordInfiniteNight(
            save,
            s.room.encounters.runId,
            night.number - 1,
          );
        if (rewardsAllowed(s.tutorial,night.duration)) save = unlockAchievements(save);
        set({
          save,
          storageFailed: save !== s.save ? persist(save) : s.storageFailed,
          room: { ...s.room, night },
        });
        s = get();
      }
    }
    const report = newsForNight(s.room.night?.number ?? 1);
    const newsSeconds = loopBroadcast(s.room.newsSeconds, delta, broadcastDuration(report));
    set({ room: { ...s.room, newsSeconds, residents: tickResidents(s.room.residents, delta, s.room.door === "OPEN") } });
    s = get();
    const old = s.room.encounters;
    if (survivalBusy(s.room.survival)) {
      const survival = tickSurvival(
        s.room.survival,
        delta,
        old.trust,
        false,
        s.room.door === "OPEN",
      );
      if (survival === s.room.survival) return;
      let room = { ...s.room, survival };
      if (
        s.room.survival.phase === "recovery" &&
        survival.phase !== "recovery"
      ) {
        room = {
          ...room,
          encounters: {
            ...old,
            active: null,
            nextIn: arrivalInterval[s.session?.difficulty ?? "easy"],
          },
        };
        if (room.door === "OPEN")
          room = transitionDoor(room, { type: "close" });
      }
      set({ room, arcade: survival.phase === "gameover" ? null : s.arcade });
      return;
    }
    const paused =
      !!s.panel ||
      (!s.focused || !!s.suspension) ||
      (old.active?.phase === "departing" &&
        old.active.decision === "admit" &&
        s.room.door !== "OPEN");
    const encounters = tickEncounters(
      old,
      delta,
      s.session?.difficulty ?? "easy",
      paused,
      s.room.door === "CLOSED" || s.room.door === "INSPECTING",
      s.room.night
        ? {
            rate: nightRate(s.room.night),
            scheduled: scheduledVisitor(s.room.night, old),
          }
        : {},
    );
    if (encounters === old) return;
    let room = {
      ...s.room,
      encounters,
      night:
        s.room.night && encounters.sequence !== old.sequence
          ? {
              ...s.room.night,
              nextArrival:
                s.room.night.elapsed + infiniteInterval(s.room.night),
            }
          : s.room.night,
    };
    if (
      old.active?.phase === "approaching" &&
      encounters.active?.phase === "waiting"
    )
      room = transitionDoor(room, {
        type: "arrival",
        id: encounters.active.id,
      });
    if (
      old.active?.phase === "departing" &&
      !encounters.active &&
      room.door === "OPEN"
    )
      room = transitionDoor(room, { type: "close" });
    if (encounters.result?.decision === "timeout" && encounters.result !== old.result) {
      room = transitionDoor(room, { type: "reject" });
      room = { ...room, view: "explore", survival: beginSurvival(encounters.result.id, false) };
    }
    if (room.view === "arcade" && encounters.active?.phase === "waiting") { gameInput.reset(); room={...room,view:"console"}; }
    set({ room, prompt: encounters.result?.decision === "timeout" ? null : s.prompt });
  },
  askVisitor: (id, question) => {
    const s = get();
    if (
      s.panel ||
      (!s.focused || !!s.suspension) ||
      s.room.night?.status === "completed" ||
      survivalBusy(s.room.survival) ||
      !["door", "inspect"].includes(s.room.view)
    )
      return;
    const encounters = askQuestion(s.room.encounters, id, question);
    if (encounters !== s.room.encounters)
      set({ room: { ...s.room, encounters } });
    if (encounters.active?.asked.length === 3) get().tutorialAdvance("questions");
  },
  decideVisitor: (id, decision) => {
    const s = get();
    if (
      s.panel ||
      (!s.focused || !!s.suspension) ||
      s.room.night?.status === "completed" ||
      survivalBusy(s.room.survival) ||
      !["door", "inspect"].includes(s.room.view)
    )
      return;
    if (!["VISITOR_WAITING", "INSPECTING"].includes(s.room.door)) return;
    if (s.tutorial) {
      if(s.tutorial!=="decide") { set({tutorialMessage:"Finish the practice steps before choosing."}); return; }
      if(decision!=="admit") { set({tutorialMessage:"Try again: Bea’s appearance and answers agree. Let her shelter inside."}); return; }
      if(s.room.encounters.active?.id!==id)return;
      gameInput.reset();
      const room=transitionDoor(s.room,{type:"open-confirmed"});
      set({tutorial:"tv",tutorialMessage:null,room:{...room,view:"explore",residents:admitResident(room.residents,id,"bea"),encounters:{...room.encounters,active:null}}});
      return;
    }
    const encounters = resolveEncounter(s.room.encounters, id, decision);
    if (encounters === s.room.encounters) return;
    const room = transitionDoor(
      { ...s.room, encounters },
      { type: decision === "admit" ? "open-confirmed" : "reject" },
    );
    let save =
      encounters.result?.coins && rewardsAllowed(s.tutorial, s.room.night?.duration)
        ? reward(s.save, `visitor:${id}`, encounters.result.coins)
        : s.save;
    if (room.night?.mode === "infinite" && rewardsAllowed(s.tutorial,room.night.duration))
      save = recordInfinite(save, {
        streak: encounters.bestStreak,
        night: room.night.number,
        correct: encounters.correct,
        totalNights: Math.floor(room.night.elapsed / 600),
      });
    set({
      room: {
        ...room,
        residents: decision === "admit" && encounters.result?.correct && s.room.encounters.active ? admitResident(room.residents, id, s.room.encounters.active.visitor) : room.residents,
        view: "explore",
        survival: encounters.result?.correct
          ? room.survival
          : beginSurvival(id, decision === "admit"),
      },
      save,
      storageFailed: save !== s.save ? persist(save) : s.storageFailed,
      prompt: null,
    });
  },
  // Legacy integration hook; news no longer gates movement or the night clock.
  finishNews: () => {
    const s = get();
    if(s.tutorial)return;
    if (
      s.scene !== "room" ||
      s.panel ||
      (!s.focused || !!s.suspension) ||
      s.room.night?.status === "completed"
    )
      return;
    const save = {
      ...s.save,
      viewedBroadcasts: [
        ...new Set([
          ...s.save.viewedBroadcasts,
          newsForNight(s.room.night?.number ?? 1).id,
        ]),
      ],
    };
    set({
      save,
      storageFailed: persist(save),
      room: {
        ...s.room,
        view: "explore",
        night: s.room.night ? { ...s.room.night, introFinished: true } : null,
      },
    });
  },
  escape: () => {
    const s = get();
    if (s.panel) s.open(null);
    else if (
      s.scene === "room" &&
      s.room.view !== "explore" &&
      s.room.view !== "news"
    )
      s.roomView("explore");
    else s.open("pause");
  },
  settings: (patch) => {
    const save = {
      ...get().save,
      settings: readSettings({ ...get().save.settings, ...patch }),
    };
    set({ save, storageFailed: persist(save) });
  },
  hydrate: () => {
    if (get().ready) return;
    try {
      const loaded = loadLocalSave(localStorage);
      const save = unlockAchievements(loaded.save);
      set({
        save,
        ready: true,
        saveNotice: loaded.notice,
        storageFailed: persist(save),
      });
    } catch {
      set({ ready: true, storageFailed: true });
    }
  },
  buy: (id) => {
    const save = unlockAchievements(purchase(get().save, id));
    set({ save, storageFailed: persist(save) });
  },
  buyAccessory: (id) => {
    const save = unlockAchievements(purchaseAccessory(get().save, id));
    set({ save, storageFailed: persist(save) });
  },
  wearAccessory: (category, id) => {
    const save = equipAccessory(get().save, category, id);
    set({ save, storageFailed: persist(save) });
  },
  claim: (id) => {
    const save = claimAchievement(get().save, id);
    set({ save, storageFailed: persist(save) });
  },
  wear: (id) => {
    const save = equip(get().save, id);
    set({ save, storageFailed: persist(save) });
  },
  open: (panel) => {
    gameInput.reset();
    if (document.pointerLockElement) document.exitPointerLock();
    set({ panel });
  },
  start: () => {
    gameInput.reset();
    const s = get();
    const number =
      s.mode === "infinite"
        ? 1
        : Math.max(
            1,
            Math.min(
              3,
              s.selectedNight,
              process.env.NODE_ENV === "development" && s.runSeconds === 60
                ? 3
                : unlockedNight(s.save),
            ),
          );
    const session = { ...createSession(s.difficulty, s.mode), night: number };
    set({
      scene: "room",
      tutorial: null, tutorialMessage: null, arcade: null,
      panel: null,
      room: rehearse(freshRoom(
        crypto.randomUUID(),
        process.env.NODE_ENV === "development" ? s.runSeconds : 300,
        session,
      ), process.env.NODE_ENV === "development" ? s.rehearsal : "standard"),
      prompt: null,
      session,
    });
  },
  lobby: () => {
    gameInput.reset();
    if (document.pointerLockElement) document.exitPointerLock();
    set({
      scene: "lobby",
      tutorial: null, tutorialMessage: null, arcade: null,
      panel: null,
      room: freshRoom(),
      prompt: null,
      session: null,
    });
  },
}));
