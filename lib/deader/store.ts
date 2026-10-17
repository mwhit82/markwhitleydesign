"use client";
import { beginJudgement, tickJudgement, JUDGEMENT_SECONDS, judgementMistakes, spendShot } from "./judgement";
import { visitorById } from "./visitors";
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
  collectWeapon: () => void;
  returnWeapon: () => void;
  aimDoor: () => void;
  fireWeapon: (target: string | null) => boolean;
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
  collectWeapon: () => {
    const s=get(); if(s.tutorial||s.scene!=="room"||s.panel||s.suspension||!s.focused||s.room.judgement||s.room.view!=="explore"||s.prompt!=="Take gun"||s.room.survival.phase!=="idle"||s.room.night?.status!=="running")return;
    set({room:{...s.room,weapon:{...s.room.weapon,collected:true}},prompt:null});
  },
  returnWeapon: () => {
    const s=get();
    if(s.scene!=="room"||s.panel||s.suspension||!s.focused||s.room.judgement||s.room.view!=="explore"||s.prompt!=="Put gun back"||s.room.survival.phase!=="idle"||s.room.night?.status!=="running")return;
    set({room:{...s.room,weapon:{...s.room.weapon,collected:false}},prompt:null});
  },
  aimDoor: () => {
    const s=get(); if(s.tutorial||s.panel||s.suspension||!s.focused||s.room.judgement||s.room.night?.status!=="running"||s.room.survival.phase!=="idle"||s.room.view!=="door"||!s.room.weapon.collected||s.room.encounters.active?.phase!=="waiting")return;
    gameInput.reset();
    set({room:{...s.room,view:"explore",door:"OPENING"},prompt:null});
  },
  fireWeapon: target => {
    const s=get(), r=s.room;
    if(s.scene!=="room"||s.tutorial||s.panel||s.suspension||!s.focused||r.view!=="explore"||r.judgement||r.night?.status!=="running"||r.survival.phase!=="idle")return false;
    const weapon=spendShot(r.weapon); if(weapon===r.weapon)return false;
    let room={...r,weapon}, save=s.save;
    const active=r.encounters.active;
    if(target && !weapon.removed.includes(target)) {
      if(active?.id===target && active.phase==="waiting" && r.door==="OPEN") {
        const encounters=resolveEncounter(r.encounters,target,"shoot");
        const coins=encounters.result?.coins??0;
        if(coins && rewardsAllowed(s.tutorial,r.night?.duration)) save=reward(save,`visitor:${target}`,coins);
        room={...room,door:"CLOSING",visitorId:null,encounters:{...encounters,active:null},weapon:{...weapon,removed:[...weapon.removed,target]},rewardToast:save!==s.save?{coins,seconds:3}:null,night:r.night?{...r.night,nextArrival:Math.max(r.night.nextArrival,r.night.elapsed+10)}:null};
      } else {
        const resident=r.residents.find(v=>v.id===target);
        if(resident) {
          const visitor=visitorById(resident.visitor), human=visitor.kind==="human";
          const e=r.encounters;
          room={...room,rewardToast:null,residents:r.residents.filter(v=>v.id!==target),weapon:{...weapon,removed:[...weapon.removed,target]},encounters:{...(human?{...e,mistakes:e.mistakes+1,trust:Math.max(0,e.trust-1),streak:0}:e),result:{id:`${target}:shot`,name:visitor.name,kind:visitor.kind,decision:"shoot",correct:!human,coins:0,explanation:human?"You shot a human who was sheltering inside. This adds one mistake.":"Anomaly removed. The earlier admission mistake remains; no extra coins are awarded."}}};
        }
      }
    }
    set({room,save,storageFailed:save!==s.save?persist(save):s.storageFailed});
    return true;
  },
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
      (get().room.night?.status === "completed" || !!get().room.judgement)
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
    if (s.panel || (!s.focused || !!s.suspension) || (s.room.night?.status === "completed" || !!s.room.judgement)) return;
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
    // An empty landing must never leave the door blocking future arrivals.
    if(event.type==="opened"&&s.room.door==="OPENING"&&(!active||active.phase==="approaching")){set({room:{...s.room,door:"CLOSING",view:"explore"},prompt:null});return;}
    if(active?.phase==="waiting"&&event.type==="close"&&s.room.door==="OPEN"){set({room:{...s.room,door:"CLOSING",view:"explore"}});return;}
    if(active?.phase==="waiting"&&event.type==="closed"&&s.room.door==="CLOSING"){set({room:{...s.room,door:"VISITOR_WAITING"}});return;}
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
    const dt=Math.min(delta,.25);
    if(s.room.night?.status==="completed"||s.room.night?.status==="failed")return;
    if(s.room.judgement) {
      const judgement=tickJudgement(s.room.judgement,delta);
      if(judgement.elapsed<JUDGEMENT_SECONDS) {set({room:{...s.room,judgement}});return;}
      const n=s.room.night!;
      const allowed=rewardsAllowed(s.tutorial,n.duration);
      if(judgement.failed) {
        let save=s.save;
        if(n.mode==="infinite"&&allowed)save=recordInfinite(save,{streak:s.room.encounters.bestStreak,night:n.number,correct:s.room.encounters.correct,totalNights:n.number-1});
        set({save,storageFailed:save!==s.save?persist(save):s.storageFailed,room:{...s.room,judgement:null,night:{...n,status:"failed"},survival:{...s.room.survival,phase:"gameover"}}});
      } else if(n.mode==="infinite") {
        let save=allowed?recordInfiniteNight(s.save,s.room.encounters.runId,n.number):s.save;
        if(allowed)save=unlockAchievements(recordInfinite(save,{streak:s.room.encounters.bestStreak,night:n.number+1,correct:s.room.encounters.correct,totalNights:n.number}));
        set({save,storageFailed:save!==s.save?persist(save):s.storageFailed,room:{...s.room,judgement:null,mistakeBaseline:s.room.encounters.mistakes,encounters:{...s.room.encounters,trust:3},weapon:{...s.room.weapon,ammo:6,cooldown:0},night:{...n,number:n.number+1,status:"running",nextArrival:n.elapsed+12}}});
      } else {
        const night={...n,status:"completed" as const,endingSeconds:14};
        let save=allowed?completeNightReward(s.save,night,s.room.encounters.runId):s.save;
        if(allowed)save=unlockAchievements({...save,endingViewed:save.endingViewed||n.number===3},s.room.encounters.mistakes===0&&s.room.encounters.correct>0);
        set({save,storageFailed:save!==s.save?persist(save):s.storageFailed,room:{...s.room,judgement:null,night}});
      }
      return;
    }
    set({room:{...s.room,weapon:{...s.room.weapon,cooldown:Math.max(0,s.room.weapon.cooldown-dt)},rewardToast:s.room.rewardToast&&s.room.rewardToast.seconds>dt?{...s.room.rewardToast,seconds:s.room.rewardToast.seconds-dt}:null}});
    s=get();
    if(s.room.night) {
      const night=advanceNight(s.room.night,delta,false,s.room.encounters.trust);
      if(night.status==="judging") {
        gameInput.reset();
        set({arcade:null,prompt:null,room:{...s.room,night:{...night,cancelledVisitor:!!s.room.encounters.active},judgement:beginJudgement(judgementMistakes(s.room.encounters.mistakes,s.room.mistakeBaseline)),view:"explore",visitorId:null,door:"CLOSED",encounters:{...s.room.encounters,active:null},survival:{...s.room.survival,phase:"idle"}}});
        if(typeof document!=="undefined"&&document.pointerLockElement)document.exitPointerLock();
        return;
      }
      if(night!==s.room.night){set({room:{...s.room,night}});s=get();}
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
          night: room.night ? {...room.night,nextArrival:Math.max(room.night.nextArrival,room.night.elapsed+10)}:null,
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
    if (old.active?.phase === "departing" && !encounters.active) {
      if(room.night)room={...room,night:{...room.night,nextArrival:Math.max(room.night.nextArrival,room.night.elapsed+10)}};
      if(room.door==="OPEN")room=transitionDoor(room,{type:"close"});
    }
    if (encounters.result?.decision === "timeout" && encounters.result !== old.result) {
      room = transitionDoor(room, { type: "reject" });
      room = { ...room, visitorId:null, door: "CLOSING", view: "explore" };
    }
    if (room.view === "arcade" && encounters.active?.phase === "waiting") { gameInput.reset(); room={...room,view:"console"}; }
    set({ room, prompt: encounters.result?.decision === "timeout" ? null : s.prompt });
  },
  askVisitor: (id, question) => {
    const s = get();
    if (
      s.panel ||
      (!s.focused || !!s.suspension) ||
      (s.room.night?.status === "completed" || !!s.room.judgement) ||
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
      (s.room.night?.status === "completed" || !!s.room.judgement) ||
      survivalBusy(s.room.survival) ||
      !["door", "inspect"].includes(s.room.view)
    )
      return;
    if (!["VISITOR_WAITING", "INSPECTING", "OPEN"].includes(s.room.door)) return;
    if(decision==="shoot")return; // Shooting must pass ammunition and ray-hit guards.
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
      { ...s.room, encounters, door:s.room.door==="OPEN"?"VISITOR_WAITING":s.room.door },
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
        rewardToast: save !== s.save ? {coins: encounters.result?.coins ?? 0, seconds:3} : room.rewardToast,
        residents: decision === "admit" && s.room.encounters.active ? admitResident(room.residents, id, s.room.encounters.active.visitor) : room.residents,
        view: "explore",
        // Mistakes are counted now; scare presentation belongs exclusively to dawn.
        survival: room.survival,
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
      (s.room.night?.status === "completed" || !!s.room.judgement)
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
    set({ panel });
    if (document.pointerLockElement) document.exitPointerLock();
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
