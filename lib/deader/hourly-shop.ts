import { cosmetics, type Save } from "./game";
import { accessories, emptyOutfit } from "./cosmetics";
import { pets } from "./pets";
import { SPECIAL_IDS, type SpecialId } from "./special-ids";
export const HOUR_MS = 3600000;
export function hourlyOffer(now: number) {
  const hour = Math.floor(
    (Number.isFinite(now) ? Math.max(0, now) : 0) / HOUR_MS,
  );
  let h = 2166136261;
  for (const c of `anomalous-specials-v1:${hour}`)
    h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return {
    id: SPECIAL_IDS[(h >>> 0) % SPECIAL_IDS.length],
    hour,
    nextChange: (hour + 1) * HOUR_MS,
  };
}
export function specialItem(id: SpecialId) {
  return id === "mini-anomaly"
    ? { ...pets.find((p) => p.id === id)!, category: "pet" as const }
    : accessories.find((a) => a.id === id)!;
}
export function ownsSpecial(s: Save, id: SpecialId) {
  return id === "mini-anomaly"
    ? s.ownedPets.includes(id)
    : s.ownedAccessories.includes(id);
}
export function specialEquipped(s: Save, id: SpecialId) {
  const item = specialItem(id);
  return item.category === "pet"
    ? s.equippedPet === id
    : s.outfit[item.category] === id;
}
export function specialPreview(s: Save, id: SpecialId) {
  const item = specialItem(id);
  return {
    colour: item.category === "pet" ? item.colour : cosmetics.find(c=>c.id===s.equipped)!.colour,
    outfit:
      item.category === "pet"
        ? emptyOutfit()
        : { ...s.outfit, [item.category]: item.id },
    pet: item.category === "pet",
    petId: item.category === "pet" ? ("mini-anomaly" as const) : undefined,
  };
}
/** Revalidate the displayed hour as well as the item, even when two hours repeat. */
export function purchaseSpecial(
  s: Save,
  id: SpecialId,
  displayedHour: number,
  now: number,
): Save {
  const offer = hourlyOffer(now),
    item = specialItem(id);
  if (
    !item ||
    offer.hour !== displayedHour ||
    offer.id !== id ||
    ownsSpecial(s, id) ||
    s.coins < item.price
  )
    return s;
  return id === "mini-anomaly"
    ? { ...s, coins: s.coins - item.price, ownedPets: [...s.ownedPets, id] }
    : {
        ...s,
        coins: s.coins - item.price,
        ownedAccessories: [...s.ownedAccessories, id],
      };
}
export function offerCountdown(now: number) {
  const remaining = Math.max(
    0,
    Math.ceil((hourlyOffer(now).nextChange - now) / 1000),
  );
  return `${Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
}
