import { boardKey, validSelection, type StageSelection } from './stages';
export type GhostSource = 'off' | 'personal' | 'leader';
export type Replay = { version:1; car:number; selection:StageSelection; time:number; samples:number[][] };
export function replayKey(selection:StageSelection,car:number) {return `rally-replay:${boardKey(selection)}:${car}`;}
export function validReplay(value:unknown): value is Replay {
 if(!value || typeof value!=='object')return false;
 const r=value as Replay;
 if(r.version!==1 || !Number.isInteger(r.car)||r.car<0||r.car>3||!validSelection(r.selection)||!Number.isFinite(r.time)||r.time<=0||r.time>600||!Array.isArray(r.samples)||r.samples.length<2||r.samples.length>2600)return false;
 let previous=-1;
 for(const s of r.samples){if(!Array.isArray(s)||s.length!==4||!s.every(Number.isFinite)||s[0]<0||s[0]<previous||s[0]>r.time+.01||Math.abs(s[1])>100||Math.abs(s[2])>100)return false;previous=s[0];}
 return r.samples[0][0]<=.1 && Math.abs(previous-r.time)<.01;
}
export function headingBetween(a:number,b:number,t:number){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}
export function replayPose(r:Replay,time:number) {
 if(time<0||time>r.time)return null;
 let lo=0,hi=r.samples.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(r.samples[mid][0]<=time)lo=mid;else hi=mid;}
 const a=r.samples[lo],b=r.samples[hi],t=Math.max(0,Math.min(1,(time-a[0])/Math.max(.000001,b[0]-a[0])));
 return {x:a[1]+(b[1]-a[1])*t,z:a[2]+(b[2]-a[2])*t,angle:headingBetween(a[3],b[3],t)};
}
export function matchingReplay(r:unknown,selection:StageSelection,car:number,time?:number):r is Replay {
 return validReplay(r)&&r.car===car&&boardKey(r.selection)===boardKey(selection)&&(time===undefined||Math.abs(r.time-time)<.001);
}
