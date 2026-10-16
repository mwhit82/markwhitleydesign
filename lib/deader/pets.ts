import type { Save } from './game';
import type { VisitorDefinition } from './visitors';
export const pets = [
    { id: 'pip', name: 'Pip', colour: '#ffc928', price: 50 },
    { id: 'patch', name: 'Patch', colour: '#617fa0', price: 75 },
    { id: 'shadow', name: 'Shadow', colour: '#44464c', price: 100 },
] as const;
export type PetId = typeof pets[number]['id'];
export function readPets(value: unknown): PetId[] {
    return Array.isArray(value) ? [...new Set(value.filter((id): id is PetId => pets.some(p => p.id === id)))] : [];
}
export function purchasePet(save: Save, id: PetId): Save {
    const pet = pets.find(p => p.id === id);
    return !pet || save.ownedPets.includes(id) || save.coins < pet.price ? save : { ...save, coins: save.coins - pet.price, ownedPets: [...save.ownedPets, id] };
}
export function equipPet(save: Save, id: PetId | null): Save {
    return id !== null && !save.ownedPets.includes(id) ? save : { ...save, equippedPet: id };
}
/** Only evidence the player has actually observed. Never consult hidden kind. */
export function petHint(visitor: VisitorDefinition, observed: ('visual' | 'cctv')[]): string | null {
    const clue = visitor.clues.find(c => c.source !== 'dialogue' && observed.includes(c.source));
    return clue ? `Something seems odd. ${clue.description}` : null;
}
