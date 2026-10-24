import { cosmetics, type Save } from "./game";
import { accessories, bundles } from "./cosmetics";
import { pets } from "./pets";
export function ownsCosmetic(save: Save, id: string): boolean {
 return [...save.owned,...save.ownedAccessories,...save.ownedPets,...save.ownedBundles].some(x=>x===id)
  || !!bundles.find(b=>b.id===id&&b.items.every(x=>save.ownedAccessories.includes(x)));
}
export function ownedCategoryAvailable(save: Save, category: string): boolean {
 const catalogue=[...cosmetics,...accessories,...bundles,...pets.map(p=>({...p,category:"pet"}))];
 return catalogue.some(item=>ownsCosmetic(save,item.id)&&(category==="accessory"?accessories.some(a=>a.id===item.id):item.category===category));
}
