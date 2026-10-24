import type { RoomState, RoomView } from '../room';
import type { Difficulty, GameMode } from '../game';
import type { Outfit } from '../cosmetics';
import type { PetId } from '../pets';
import type { Kitchen, KitchenAction } from '../kitchen';
import type { Weapon } from '../judgement';
import type { Question } from '../visitors';
export const PROTOCOL = 1, CAPACITY = 4, RECONNECT_MS = 30000;
export const SIGNALS = ['Door', 'Check CCTV', 'Kitchen', 'Need help', 'Yes', 'No'] as const;
export type Signal = typeof SIGNALS[number];
export type Pose = {
    x: number;
    z: number;
    yaw: number;
    pitch: number;
    view: RoomView;
    feed: number;
    head?: number[];
    left?: number[];
    right?: number[];
};
export type Appearance = {
    colour: string;
    outfit: Outfit;
    pet: PetId | null;
};
export type Member = {
    id: string;
    name: string;
    joined: number;
    seen: number;
    connected: boolean;
    ready: boolean;
    alive: boolean;
    appearance: Appearance;
    unlocked: number;
    pose: Pose;
    kitchen: Kitchen;
    weapon: Weapon;
    lastAction: number;
    lastSignal: number;
    lastPose: number;
    lastTeleport?: number;
    sequences: string[];
};
export type Receipt = {
    id: string;
    coins: number;
    night: number;
    difficulty: Difficulty;
    mode: GameMode;
    passed: boolean;
    members: string[];
};
export type CoopRoom = {
    version: 1;
    code: string;
    host: string;
    revision: number;
    phase: 'lobby' | 'playing' | 'results';
    paused: boolean;
    settings: {
        difficulty: Difficulty;
        mode: GameMode;
        night: number;
    };
    members: Member[];
    world: RoomState;
    lastTick: number;
    emptySince: number | null;
    doorSeconds: number;
    signals: {
        id: string;
        member: string;
        text: Signal;
        at: number;
    }[];
    receipts: Receipt[];
    stalkerTarget: string | null;
    expired: boolean;
};
export type Action = {type:'appearance';appearance:Appearance} | {
    type: 'ready';
    ready: boolean;
} | {
    type: 'configure';
    difficulty: Difficulty;
    mode: GameMode;
    night: number;
} | {
    type: 'start';
} | {
    type: 'pause';
    paused: boolean;
} | {
    type: 'leave';
} | {
    type: 'pose';
    pose: Pose;
} | {
    type: 'signal';
    text: Signal;
} | {
    type: 'decision';
    visitor: string;
    decision: 'admit' | 'reject';
} | {
    type: 'question';
    visitor: string;
    question: Question;
} | {
    type: 'kitchen';
    action: KitchenAction;
} | {
    type: 'weapon';
    collect: boolean;
} | {
    type: 'aim';
} | {
    type: 'shoot';
    target: string | null;
} | {
    type: 'observe';
    camera: boolean;
    gaze: boolean;
    anchor: number;
};
export type Envelope = {
    version: 1;
    type: 'action';
    id: string;
    run: string;
    action: Action;
};
export type Membership = {
    code: string;
    id: string;
    token: string;
};
export type ClientMessage = Envelope | {
    version: 1;
    type: 'hello';
    id: string;
    token: string;
} | {
    version: 1;
    type: 'voice';
    to: string;
    ready?: true;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
};
export type ServerMessage = {
    type: 'room';
    room: CoopRoom;
} | {
    type: 'pose';
    run:string;
    member: string;
    pose: Pose;
} | {
    type: 'error';
    error: string;
} | {
    type: 'voice';
    from: string;
    ready?: true;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
};
