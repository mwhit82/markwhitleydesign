import type { Save } from "./game";
export const accessories = [
  {
    id: "watch-cap",
    name: "Night Watch Cap",
    category: "hat",
    price: 60,
    colour: "#687249",
  },
  {
    id: "tin-hat",
    name: "Dented Tin Hat",
    category: "hat",
    price: 90,
    colour: "#98978b",
  },
  {
    id: "shift-pack",
    name: "Old Shift Pack",
    category: "backpack",
    price: 80,
    colour: "#776044",
  },
  {
    id: "round-glasses",
    name: "Round Glasses",
    category: "glasses",
    price: 40,
    colour: "#bbaa7a",
  },
] as const;
export type AccessoryId = (typeof accessories)[number]["id"];
export type AccessoryCategory = (typeof accessories)[number]["category"];
export type Outfit = Record<AccessoryCategory, AccessoryId | null>;
export const emptyOutfit = (): Outfit => ({
  hat: null,
  backpack: null,
  glasses: null,
});
export const isAccessory = (id: unknown): id is AccessoryId =>
  accessories.some((a) => a.id === id);
export function readAccessories(raw: unknown): AccessoryId[] {
  return Array.isArray(raw) ? [...new Set(raw.filter(isAccessory))] : [];
}
export function readOutfit(raw: unknown, owned: AccessoryId[]): Outfit {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const outfit = emptyOutfit();
  for (const category of Object.keys(outfit) as AccessoryCategory[]) {
    const item = accessories.find(
      (a) => a.id === source[category] && a.category === category,
    );
    if (item && owned.includes(item.id)) outfit[category] = item.id;
  }
  return outfit;
}
export function purchaseAccessory(s: Save, id: AccessoryId): Save {
  const item = accessories.find((a) => a.id === id);
  return !item || s.ownedAccessories.includes(id) || s.coins < item.price
    ? s
    : {
        ...s,
        coins: s.coins - item.price,
        ownedAccessories: [...s.ownedAccessories, id],
      };
}
export function equipAccessory(
  s: Save,
  category: AccessoryCategory,
  id: AccessoryId | null,
): Save {
  if (!(category in emptyOutfit())) return s;
  if (
    id !== null &&
    (!s.ownedAccessories.includes(id) ||
      !accessories.some((a) => a.id === id && a.category === category))
  )
    return s;
  return { ...s, outfit: { ...s.outfit, [category]: id } };
}
