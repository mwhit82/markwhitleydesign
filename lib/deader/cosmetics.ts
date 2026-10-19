import { isHourlySpecial } from "./special-ids";
import type { Save } from "./game";
export const accessories = [
 {id:"mystery-prop",name:"Mystery Prop",category:"hand",price:50,colour:"#e6bd22"},
 {id:"headphones",name:"Headphones",category:"hat",price:75,colour:"#e6bd22"},
 {id:"glitch-particles",name:"Glitch Particles",category:"effect",price:100,colour:"#42b8c1"},
 {id:"rainbow-finish",name:"Rainbow Stripes",category:"finish",price:50,colour:"#a855dd"},
 {id:"rainbow-hat",name:"Rainbow Hat",category:"hat",price:50,colour:"#e8ab28"},
 {id:"cake",name:"Party Cake",category:"hand",price:50,colour:"#ed9f89"},
 {id:"confetti",name:"Confetti",category:"effect",price:50,colour:"#49bf8a"},
 {id:"chipped-finish",name:"Chipped Plastic",category:"finish",price:50,colour:"#d1ad27"},
 {id:"bandages",name:"Bandages",category:"wrap",price:50,colour:"#e3ded0"},
 {id:"dangling-eye",name:"Dangling Eye",category:"face",price:50,colour:"#262322"},
 {id:"plastic-chips",name:"Plastic Chips",category:"effect",price:50,colour:"#bf7936"},
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
  finish:null, hand:null, effect:null, wrap:null, face:null,
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
  return isHourlySpecial(id) || !item || s.ownedAccessories.includes(id) || s.coins < item.price
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

export const bundles = [
 {id:'rainbow',name:'Rainbow Bundle',category:'bundle',price:150,colour:'#b655dd',items:['rainbow-finish','rainbow-hat','cake','confetti'],description:'Rainbow stripes, matching hat, cake and confetti.'},
 {id:'injured',name:'Injured Bundle',category:'bundle',price:150,colour:'#cfb14c',items:['chipped-finish','bandages','dangling-eye','plastic-chips'],description:'Chipped plastic, bandages, dangling eye and plastic chips.'},
] as const;
export type BundleId=typeof bundles[number]['id'];
export const readBundles=(raw:unknown):BundleId[]=>Array.isArray(raw)?[...new Set(raw.filter((id):id is BundleId=>bundles.some(b=>b.id===id)))]:[];
export function purchaseBundle(save:Save,id:BundleId):Save {
 const bundle=bundles.find(b=>b.id===id);
 if(!bundle||save.ownedBundles.includes(id)||bundle.items.every(item=>save.ownedAccessories.includes(item))||save.coins<bundle.price)return save;
 return {...save,coins:save.coins-bundle.price,ownedBundles:[...save.ownedBundles,id],ownedAccessories:[...new Set([...save.ownedAccessories,...bundle.items])]};
}
export function bundleOutfit(outfit:Outfit,id:BundleId):Outfit {
 const result={...outfit};for(const itemId of bundles.find(b=>b.id===id)!.items){const item=accessories.find(a=>a.id===itemId)!;result[item.category]=item.id;}return result;
}
export function equipBundle(save:Save,id:BundleId):Save {
 const bundle=bundles.find(b=>b.id===id);
 return bundle&&(save.ownedBundles.includes(id)||bundle.items.every(item=>save.ownedAccessories.includes(item)))?{...save,outfit:bundleOutfit(save.outfit,id)}:save;
}
