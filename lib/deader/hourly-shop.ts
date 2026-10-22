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

export const specialDescriptions: Record<SpecialId,string> = {
 "mystery-prop":"A mystery to hold. Decorative only; cannot be used.",
 "headphones":"Worn black-and-yellow headphones. Replaces your hat.",
 "mini-anomaly":"A little anomaly on your side. Notices the same clues as other pets.",
 "glitch-particles":"Coloured glitch fragments. Replaces your particle effect.",
 "bent-halo":"A crooked, tarnished halo. Replaces your hat.",
 "midnight-crown":"A chipped black crown with amber studs. Replaces your hat.",
 "static-specs":"Thick frames with softly moving static lenses. Replaces your glasses.",
 "moon-patch":"A fabric crescent patch over one eye. Replaces your face accessory.",
 "lost-signal-pack":"A battered radio pack with a bent aerial. Replaces your backpack.",
 "pocket-moon":"A small cracked moon ornament. Decorative only; put away while holding the gun.",
 "porcelain-cracks":"Ivory plastic with painted cracks. Replaces your body finish.",
 "shadow-moths":"Six drifting shadow moths. Replaces your particle effect; hidden with reduced motion.",
};
