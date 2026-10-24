import { accessories, emptyOutfit } from '../cosmetics';
import { cosmetics } from '../game';
import { pets } from '../pets';
import { validPose } from './simulation';
import { SIGNALS, type Action, type Appearance } from './types';
export function appearance(value: unknown): Appearance {
    const v = value as Partial<Appearance> | null;
    const outfit = emptyOutfit();
    for (const a of accessories)
        if (v?.outfit?.[a.category] === a.id)
            outfit[a.category] = a.id;
    return { colour: cosmetics.find(c => c.colour === v?.colour)?.colour ?? '#ffc928', outfit, pet: pets.some(p => p.id === v?.pet) ? v!.pet! : null };
}
export function validName(value: unknown): value is string { return typeof value === 'string' && /^[\p{L}\p{N} _-]{2,20}$/u.test(value.trim()); }
const short = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160;
export function parseAction(value: unknown): Action {
    const a = value as Action;
    if (!a || typeof a !== 'object')
        throw Error('Invalid action');
    switch (a.type) {
        case 'appearance':return {type:'appearance',appearance:appearance(a.appearance)};
        case 'start':
        case 'leave':
        case 'aim': return { type: a.type };
        case 'ready':
            if (typeof a.ready === 'boolean')
                return a;
            break;
        case 'pause':
            if (typeof a.paused === 'boolean')
                return a;
            break;
        case 'configure':
            if (['easy', 'medium', 'hard'].includes(a.difficulty) && ['normal', 'infinite'].includes(a.mode) && Number.isInteger(a.night))
                return a;
            break;
        case 'pose':
            if (validPose(a.pose))
                return a;
            break;
        case 'signal':
            if (SIGNALS.includes(a.text))
                return a;
            break;
        case 'decision':
            if (short(a.visitor) && ['admit', 'reject'].includes(a.decision))
                return a;
            break;
        case 'question':
            if (short(a.visitor) && ['identity', 'purpose', 'origin'].includes(a.question))
                return a;
            break;
        case 'kitchen':
            if (['food', 'drink', 'cook', 'eat', 'off'].includes(a.action))
                return a;
            break;
        case 'weapon':
            if (typeof a.collect === 'boolean')
                return a;
            break;
        case 'shoot':
            if (a.target === null || short(a.target))
                return a;
            break;
        case 'observe':
            if (typeof a.camera === 'boolean' && typeof a.gaze === 'boolean' && Number.isInteger(a.anchor))
                return a;
            break;
    }
    throw Error('Invalid action');
}
