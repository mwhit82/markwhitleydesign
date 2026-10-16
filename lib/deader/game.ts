import { readPets, type PetId } from "./pets";
import {
  emptyOutfit,
  readAccessories,
  readOutfit,
  type Outfit,
  type AccessoryId,
} from "./cosmetics";
import { readAchievements, type AchievementId } from "./achievements";
import {
  emptyRecords,
  readRecords,
  readCompletions,
  type Records,
} from "./progression";
import { defaultSettings, readSettings, type Settings } from "./survival";
export const cosmetics = [
  {
    id: "yellow",
    name: "Classic Yellow",
    price: 0,
    colour: "#ffc928",
    category: "colour",
  },
  {
    id: "green",
    name: "Lime Green",
    price: 50,
    colour: "#8bdf26",
    category: "colour",
  },
  {
    id: "pink",
    name: "Bubblegum Pink",
    price: 75,
    colour: "#f78fb9",
    category: "colour",
  },
  {
    id: "blue",
    name: "Midnight Blue",
    price: 100,
    colour: "#29488f",
    category: "colour",
  },
  {
    id: "black",
    name: "Shadow Black",
    price: 150,
    colour: "#24232c",
    category: "colour",
  },
] as const;
export type ColourId = (typeof cosmetics)[number]["id"];
export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "normal" | "infinite";
export type Session = { difficulty: Difficulty; mode: GameMode; night: number };
export type Visitor = {
  id: string;
  kind: "human" | "anomaly";
  evidence: string[];
  dialogue: string[];
};
export type Decision = "admit" | "reject";
export const NIGHT = { seconds: 600, trust: 3, normalNights: 3 } as const;
export const difficultyConfig = {
  easy: { visitorInterval: 55, clueSubtlety: 0.2 },
  medium: { visitorInterval: 40, clueSubtlety: 0.5 },
  hard: { visitorInterval: 28, clueSubtlety: 0.8 },
};
export type Save = {
  ownedPets: PetId[];
  equippedPet: PetId | null;
  completions: Record<Difficulty, number[]>;
  infiniteRecords: Records;
  endingViewed: boolean;
  settings: Settings;
  version: 2;
  ownedAccessories: AccessoryId[];
  outfit: Outfit;
  achievements: AchievementId[];
  coins: number;
  owned: ColourId[];
  equipped: ColourId;
  completedNights: number;
  infiniteBest: number;
  claimedRewards: string[];
  viewedBroadcasts: string[];
};
export const newSave = (): Save => ({
  ownedPets: [], equippedPet: null,
  completions: { easy: [], medium: [], hard: [] },
  infiniteRecords: emptyRecords(),
  endingViewed: false,
  settings: defaultSettings(),
  version: 2,
  ownedAccessories: [],
  outfit: emptyOutfit(),
  achievements: [],
  coins: 150,
  owned: ["yellow"],
  equipped: "yellow",
  completedNights: 0,
  infiniteBest: 0,
  claimedRewards: [],
  viewedBroadcasts: [],
});
const isColour = (v: unknown): v is ColourId =>
  cosmetics.some((c) => c.id === v);
const integer = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : fallback;
export function readSave(raw: string | null): Save {
  if (!raw) return newSave();
  try {
    const s = JSON.parse(raw);
    if (!s || (s.version !== 1 && s.version !== 2)) return newSave();
    const owned: ColourId[] = [
      ...new Set<ColourId>([
        "yellow",
        ...(Array.isArray(s.owned) ? s.owned.filter(isColour) : []),
      ]),
    ];
    return {
      ownedPets: readPets(s.ownedPets),
      equippedPet: readPets(s.ownedPets).includes(s.equippedPet) ? s.equippedPet : null,
      viewedBroadcasts: Array.isArray(s.viewedBroadcasts)
        ? [
            ...new Set<string>(
              s.viewedBroadcasts.filter(
                (v: unknown) => typeof v === "string" && v.length < 100,
              ),
            ),
          ]
        : [],
      completions: readCompletions(s.completions),
      infiniteRecords: readRecords(s.infiniteRecords),
      endingViewed: s.endingViewed === true,
      settings: readSettings(s.settings),
      version: 2,
      ownedAccessories: readAccessories(s.ownedAccessories),
      outfit: readOutfit(s.outfit, readAccessories(s.ownedAccessories)),
      achievements: readAchievements(s.achievements),
      coins: integer(s.coins),
      owned,
      equipped: owned.includes(s.equipped) ? s.equipped : "yellow",
      completedNights: integer(s.completedNights),
      infiniteBest: integer(s.infiniteBest),
      claimedRewards: Array.isArray(s.claimedRewards)
        ? [
            ...new Set<string>(
              s.claimedRewards.filter((v: unknown) => typeof v === "string"),
            ),
          ]
        : [],
    };
  } catch {
    return newSave();
  }
}
export function purchase(s: Save, id: ColourId): Save {
  const item = cosmetics.find((c) => c.id === id);
  return !item || s.owned.includes(id) || s.coins < item.price
    ? s
    : { ...s, coins: s.coins - item.price, owned: [...s.owned, id] };
}
export const equip = (s: Save, id: ColourId): Save =>
  s.owned.includes(id) ? { ...s, equipped: id } : s;
export function reward(
  s: Save,
  id: string,
  coins: number,
  night = 0,
  score = 0,
): Save {
  if (
    !id ||
    s.claimedRewards.includes(id) ||
    !Number.isSafeInteger(coins) ||
    coins < 0
  )
    return s;
  return {
    ...s,
    coins: s.coins + coins,
    claimedRewards: [...s.claimedRewards, id],
    completedNights: Math.max(s.completedNights, integer(night)),
    infiniteBest: Math.max(s.infiniteBest, integer(score)),
  };
}
export function clockLabel(seconds: number) {
  const minutes = Math.floor(
    Math.min(1, Math.max(0, seconds / NIGHT.seconds)) * 355,
  );
  return `${Math.floor(minutes / 60) || 12}:${String(minutes % 60).padStart(2, "0")} AM`;
}
export const createSession = (
  difficulty: Difficulty,
  mode: GameMode,
): Session => ({ difficulty, mode, night: 1 });
export type Obstacle = { x: number; z: number; hx: number; hz: number };
export const LOBBY_OBSTACLES: Obstacle[] = [
  { x: 2.2, z: -3.4, hx: .4, hz: .35 },
  { x: -3.9, z: -1, hx: 0.7, hz: 1.4 },
  { x: 3.9, z: -1, hx: 0.7, hz: 1.4 },
];
export const ROOM_CCTV = { x: -2.1, z: 1.25 } as const;
export const ROOM_OBSTACLES: Obstacle[] = [
  { x: 2.8, z: -0.4, hx: 0.73, hz: 1.28 },
  { ...ROOM_CCTV, hx: 0.8, hz: 0.6 },
  { x: -1.7, z: -2.88, hx: 0.43, hz: 0.2 },
];
export const ROOM_CLOSED_OBSTACLES: Obstacle[] = [
  ...ROOM_OBSTACLES,
  { x: 0.25, z: -3.49, hx: 0.87, hz: 0.065 },
];
export function move(
  position: { x: number; z: number },
  dx: number,
  dz: number,
  dt: number,
  bounds: number,
  obstacles: Obstacle[],
) {
  const length = Math.max(1, Math.hypot(dx, dz));
  const distance = Math.min(Math.max(dt, 0), 0.05) * 2.7;
  const p = { ...position };
  const valid = (x: number, z: number) =>
    Math.abs(x) <= bounds - 0.3 &&
    Math.abs(z) <= bounds - 0.3 &&
    !obstacles.some(
      (o) => Math.abs(x - o.x) < o.hx + 0.3 && Math.abs(z - o.z) < o.hz + 0.3,
    );
  const x = p.x + (dx / length) * distance;
  if (valid(x, p.z)) p.x = x;
  const z = p.z + (dz / length) * distance;
  if (valid(p.x, z)) p.z = z;
  return p;
}
