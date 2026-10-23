import { freshKitchen, type Kitchen } from "./kitchen";
import { freshStalker, emptyStalkerSight, type StalkerState, type StalkerSight } from "./stalker";
import { freshWeapon, type Weapon, type Judgement } from "./judgement";
import type { Resident } from "./lounge";
import type { Session } from "./game";
import { freshNight, type Night } from "./night";
import { freshSurvival, type Survival } from "./survival";
import { freshEncounters, type Encounters } from "./visitors";
/** Pure room interaction state. Visitors and the night scheduler will dispatch here. */
export type DoorState =
  | "CLOSED"
  | "VISITOR_WAITING"
  | "INSPECTING"
  | "OPENING"
  | "OPEN"
  | "CLOSING"
  | "LOCKED";
export type RoomView =
  "fridge" | "oven" | "console" | "arcade" | "tv" | "lounge-tv" | "explore" | "door" | "inspect" | "cctv" | "news" | "donut" | "vent";
export type Feed = 0 | 1 | 2 | 3 | 4 | 5;
export type RoomState = {
  kitchen: Kitchen;
  stalker: StalkerState;
  stalkerSight: StalkerSight;
  previewBundle?: "rainbow"|"injured";
  judgement: Judgement | null;
  mistakeBaseline: number;
  weapon: Weapon;
  rewardToast: { coins: number; seconds: number } | null;
  residents: Resident[];
  night: Night | null;
  survival: Survival;
  view: RoomView;
  door: DoorState;
  visitorId: string | null;
  resolved: string[];
  feed: Feed;
  newsSeconds: number;
  encounters: Encounters;
};
export const freshRoom = (
  runId = "preview",
  duration?: 300 | 60,
  session?: Session,
): RoomState => ({
  kitchen: freshKitchen(),
  stalker: freshStalker(session?.night ?? 1), stalkerSight: emptyStalkerSight(),
  judgement: null, mistakeBaseline: 0, weapon: freshWeapon(), rewardToast: null,
  residents: [],
  night: duration ? freshNight(duration, session) : null,
  survival: freshSurvival(),
  encounters: freshEncounters(runId),
  view: "explore",
  door: "CLOSED",
  visitorId: null,
  resolved: [],
  feed: 0,
  newsSeconds: 0,
});
export type DoorEvent =
  | { type: "arrival"; id: string }
  | { type: "inspect" }
  | { type: "leave-inspection" }
  | { type: "open-confirmed" }
  | { type: "reject" }
  | { type: "opened" }
  | { type: "close" }
  | { type: "closed" }
  | { type: "lock" }
  | { type: "unlock" };
export function transitionDoor(s: RoomState, e: DoorEvent): RoomState {
  const ready =
    s.door === "CLOSED" ||
    s.door === "VISITOR_WAITING" ||
    s.door === "INSPECTING";
  switch (e.type) {
    case "arrival":
      return (s.door === "CLOSED" || s.door === "INSPECTING") &&
        !s.visitorId &&
        e.id &&
        !s.resolved.includes(e.id)
        ? {
            ...s,
            door: s.door === "INSPECTING" ? "INSPECTING" : "VISITOR_WAITING",
            visitorId: e.id,
          }
        : s;
    case "inspect":
      return ready ? { ...s, door: "INSPECTING", view: "inspect" } : s;
    case "leave-inspection":
      return s.door === "INSPECTING"
        ? {
            ...s,
            door: s.visitorId ? "VISITOR_WAITING" : "CLOSED",
            view: "door",
          }
        : s;
    case "open-confirmed":
      return ready
        ? {
            ...s,
            door: "OPENING",
            view: "explore",
            visitorId: null,
            resolved: s.visitorId ? [...s.resolved, s.visitorId] : s.resolved,
          }
        : s;
    case "reject":
      return ready && s.visitorId
        ? {
            ...s,
            door: "CLOSED",
            visitorId: null,
            view: "door",
            resolved: [...s.resolved, s.visitorId],
          }
        : s;
    case "opened":
      return s.door === "OPENING" ? { ...s, door: "OPEN" } : s;
    case "close":
      return s.door === "OPEN" ? { ...s, door: "CLOSING", view: "explore" } : s;
    case "closed":
      return s.door === "CLOSING" ? { ...s, door: "CLOSED" } : s;
    case "lock":
      return s.door === "CLOSED" ? { ...s, door: "LOCKED" } : s;
    case "unlock":
      return s.door === "LOCKED" ? { ...s, door: "CLOSED" } : s;
  }
}
export const FEEDS = [
  { label: "Office", position: [-3.3, 2.95, 2.8], target: [0, 1, -1.7] },
  { label: "Vent", position: [-1.7, 3.7, -2.6], target: [-1.7, 3.7, -7] },
  { label: "Stairs", position: [-2.2, 2.8, -5], target: [0.25, -0.3, -9.4] },
  {
    label: "Back corridor",
    position: [2.4, 2.5, -10.8],
    target: [0.25, 1, -4.1],
  },
  { label: "Door rear", position: [0.25, 1.8, -7.6], target: [0.25, 1, -3.8] },
  { label: "Holding lounge", position: [-3.2, 2.9, 4.3], target: [0, 1, 8] },
] as const;
export type Broadcast = {
  id: string;
  channel: string;
  title: string;
  segments: {
    seconds: number;
    subtitle: string;
    headline: string;
    image?: string;
    audio?: string;
  }[];
};
export const NIGHT_ONE_NEWS: Broadcast = {
  id: "night-1-intro",
  channel: "THE ANOMALOUS NEWS OFFICIAL",
  title: "They're here.",
  segments: [
    {
      seconds: 6,
      headline: "BREAKING NEWS",
      subtitle:
        "Each night gets more dangerous. Check every visitor carefully. Strange individuals have appeared across the city. Authorities are calling them Anomalies.",
    },
    {
      seconds: 7,
      headline: "LOOKS CAN DECEIVE",
      subtitle:
        "A figure hiding in the room? Look straight at it until it leaves. They pretend to be ordinary people. They slowly walk up stairs, then knock on doors. Polite knocking is not proof of humanity.",
    },
    {
      seconds: 7,
      headline: "CHECK BEFORE YOU OPEN",
      subtitle:
        "Watch the cameras. Inspect their eyes, faces and movements through the peephole. Ask questions. Strange answers can be a warning.",
    },
    {
      seconds: 7,
      headline: "PEOPLE NEED SHELTER",
      subtitle:
        "Some visitors are genuine humans. They must be admitted. Rejecting everyone is not a solution. Letting an Anomaly inside is dangerous.",
    },
    {
      seconds: 7,
      headline: "THREE CHANCES",
      subtitle:
        "A wrong decision or missed deadline adds a mistake. The Auditor arrives at dawn. Three mistakes fail the judgement. Correct decisions earn five coins.",
    },
    {
      seconds: 6,
      headline: "STAY UNTIL 5:55 AM",
      subtitle:
        "Survive until 5:55 AM. This has been The Anomalous News Official. Our advice: remain calm. Our presenter has not.",
    },
  ],
};
export const broadcastDuration = (b: Broadcast) =>
  b.segments.reduce((n, s) => n + s.seconds, 0);
export function broadcastSegment(b: Broadcast, elapsed: number) {
  let end = 0;
  return (
    b.segments.find((s) => {
      end += s.seconds;
      return elapsed < end;
    }) ?? b.segments[b.segments.length - 1]
  );
}
export function advanceBroadcast(
  elapsed: number,
  delta: number,
  paused: boolean,
  b: Broadcast,
  rate = 1,
) {
  return paused || !Number.isFinite(delta)
    ? elapsed
    : Math.min(
        broadcastDuration(b),
        elapsed + Math.max(0, Math.min(delta, 0.25)) * rate,
      );
}

export function newsForNight(number: number): Broadcast {
  if (number <= 1) return NIGHT_ONE_NEWS;
  return {
    ...NIGHT_ONE_NEWS,
    id: `night-${Math.min(3, number)}-intro`,
    title: number === 2 ? "Trust Nobody" : "The Anomalous",
    segments: [
      {
        seconds: 8,
        headline: number === 2 ? "TRUST NOBODY" : "THE LAST SHIFT",
        subtitle:
          number === 2
            ? "The danger is growing every night. Tonight the visitors are learning. Familiar faces can still tell impossible stories."
            : "Each night has been more dangerous than the last. Tonight is the most dangerous yet. Keep checking visitors until morning.",
      },
      {
        seconds: 10,
        headline: "LISTEN CLOSELY",
        subtitle:
          "Ask who they are, why they came and where they started. Compare every answer. A convincing face is not proof.",
      },
      {
        seconds: 10,
        headline: "WATCH THE STAIRS",
        subtitle:
          "Some visitors stop in unnatural patterns. Others look ordinary but contradict themselves. Humans still need shelter.",
      },
      {
        seconds: 12,
        headline: "THREE CHANCES",
        subtitle:
          "The Auditor judges every five minutes. Keep this shift below three mistakes. Donut is watching.",
      },
    ],
  };
}

/** Confirmation belongs to one still-waiting encounter, never the next visitor. */
export function canConfirmDoor(room: RoomState, encounterId: string | null) {
  const active = room.encounters.active;
  return room.view === "door" && room.survival.phase === "idle" && room.night?.status !== "completed" && !room.judgement &&
    (["CLOSED", "VISITOR_WAITING", "INSPECTING"].includes(room.door) || (room.door === "OPEN" && !!active)) &&
    (active ? active.id === encounterId && active.phase === "waiting" : encounterId === null);
}
