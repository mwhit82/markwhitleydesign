import {advanceCheckpoints,segmentDistance} from '../../components/rally/checkpoints';
import { matchingReplay } from "../../components/rally/replay";
import { lapCount, checkpointIndices, stagePoints, validSelection, compatibleCar, type StageSelection } from '../../components/rally/stages';
export function validName(name: unknown): name is string { return typeof name==='string' && /^[\p{L}\p{N} _.-]{2,20}$/u.test(name.trim()); }
export function validCar(car: unknown,selection?:StageSelection): car is number { return Number.isInteger(car) && Number(car)>=0 && Number(car)<11 && (!selection||compatibleCar(selection,Number(car))); }
export function validateRun(selection: StageSelection, time: unknown, trace: unknown, elapsed: number) {
  if(!validSelection(selection) || typeof time!=='number' || !Number.isFinite(time) || time<15 || time>600 || time>elapsed+1) return false;
  if(!Array.isArray(trace) || trace.length<20 || trace.length>2600) return false;
  const points=stagePoints(selection);
  let previous:number[]|null=null, checkpoint=0,lap=1,finishArmed=false;
  for(const row of trace) {
    if(!Array.isArray(row) || row.length!==3 || !row.every(v=>typeof v==='number' && Number.isFinite(v))) return false;
    const [t,x,z]=row;
    if(t<0 || t>time+.1 || Math.abs(x)>82 || Math.abs(z)>77) return false;
    if(previous) {
      const dt=t-previous[0];
      if(dt<0 || dt>.6 || Math.hypot(x-previous[1],z-previous[2])>27*dt+1.2) return false;
    } else if(t>.1 || Math.hypot(x-points[0].x,z-points[0].z)>3) return false;
    if(Math.hypot(x-points[0].x,z-points[0].z)>14)finishArmed=true;
    if(selection.circuitVersion===2&&previous){
      const passage=advanceCheckpoints(points,checkpointIndices,checkpoint,{x:previous[1],z:previous[2]},{x,z},t,true,finishArmed);
      if(passage.events.some(e=>e.outcome==='missed'))return false;
      checkpoint=passage.cursor;
      if(passage.finished&&lap<lapCount(selection)){lap++;checkpoint=0;finishArmed=false;}
    }
    const target=points[checkpointIndices[checkpoint]];
    if(selection.circuitVersion!==2 && target && (Math.hypot(x-target.x,z-target.z)<10 || (previous && segmentDistance({x:previous[1],z:previous[2]},{x,z},target)<10))) checkpoint++;
    previous=row;
  }
  return lap===lapCount(selection) && checkpoint===checkpointIndices.length && previous!==null && Math.abs(previous[0]-time)<.1;
}

export function replayAgrees(replay:unknown,selection:StageSelection,car:number,time:number,trace:number[][]) {
 if(!matchingReplay(replay,selection,car,time)||replay.samples.length!==trace.length)return false;
 return replay.samples.every((s,i)=>Math.abs(s[0]-trace[i][0])<=.002&&Math.abs(s[1]-trace[i][1])<=.011&&Math.abs(s[2]-trace[i][2])<=.011);
}
