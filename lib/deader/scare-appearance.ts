import type { DawnEntry, VisitorDefinition } from './visitors';
export type ScareAppearance = {
  colour:string;
  thirdEye:boolean;
  mouthWidth:number;
  split:boolean;
  glitch:boolean;
};
/** Always derive from the encounter snapshot, never re-generate its identity. */
export function scareAppearance(profile:VisitorDefinition):ScareAppearance {
  return {
    colour:profile.colour,
    thirdEye:profile.appearance==='third-eye',
    mouthWidth:profile.appearance==='wide-mouth'?1.4:1,
    split:profile.appearance==='splitter',
    glitch:profile.appearance==='glitched',
  };
}
export function dawnAppearance(entry:DawnEntry|null|undefined):ScareAppearance|null {
  return entry&&!entry.shot&&entry.profile.kind==='anomaly'?scareAppearance(entry.profile):null;
}
