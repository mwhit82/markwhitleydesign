import type { RoomState } from './room';
export type TutorialStep = 'move' | 'look' | 'tablet' | 'inspect' | 'questions' | 'camera' | 'decide' | 'tv' | 'finish';
export const tutorialCopy: Record<TutorialStep, {
    title: string;
    body: string;
}> = {
    move: { title: 'Try moving', body: 'Use the Move circle or WASD to walk around the lobby.' },
    look: { title: 'Look around', body: 'Swipe the empty screen, or drag with your mouse, to turn the camera.' },
    tablet: { title: 'Walk to the tablet', body: 'Find the glowing LEARN TO PLAY tablet. Walk close and choose Learn to play, or press E.' },
    inspect: { title: 'Someone needs shelter', body: 'Walk to the wooden door and interact to look through the peephole. This is safe practice.' },
    questions: { title: 'Ask who they are', body: 'Open Visitor questions and ask all three questions. Do the answers agree?' },
    camera: { title: 'Check the cameras', body: 'Step back into the room. Find CCTV, choose View cameras, then select Door rear.' },
    decide: { title: 'Answer the door', body: 'Return to the door. Bea has two eyes and a consistent story. Choose Answer the door, then Let in.' },
    tv: { title: 'Watch the news', body: 'Find the TV above Donut’s bowl and choose Watch TV. Subtitles appear only while watching.' },
    finish: { title: 'Ready for your shift', body: 'CCTV also has Impossible Shift between knocks. It saves your place when a visitor arrives. Shop sidekicks bark at arrivals and point out clues you have seen. A quiet pet does not mean someone is safe. Correct choices earn five coins. At dawn the Auditor counts mistakes: three or more fails the shift. The shelf gun has six shots; shooting humans adds mistakes.' },
};
export function tutorialRoom(room: RoomState): RoomState {
    const id = `${room.encounters.runId}:practice`;
    return { ...room, night: null, door: 'VISITOR_WAITING', visitorId: id, encounters: { ...room.encounters, active: { id, visitor: 'bea', phase: 'waiting', elapsed: 0, asked: [], decision: null } } };
}
export function rewardsAllowed(tutorial: TutorialStep | null, duration: number | undefined) { return !tutorial && duration === 300; }
