import type {StageSelection} from './stages';
import {stagePoints} from './stages';
export type PaceNote={index:number;distance:number;clips:string[];text:string};
import {routeNotes} from './pace-notes';
/** Explicit per-route notes; weather and light never change the route. */
export function paceNotes(selection:StageSelection):PaceNote[]{
 if(['kart','neon','mx'].includes(selection.stage))return [];
 const points=stagePoints(selection),distances=[0];
 for(let i=1;i<points.length;i++)distances.push(distances[i-1]+points[i].distanceTo(points[i-1]));
 return (routeNotes[`${selection.stage}:${selection.track??1}:${selection.reverse?'reverse':'forward'}`]??[]).map(([index,clip])=>{
  const [grade,side]=clip.split('-');
  const text=clip==='crest'?'Crest':clip==='finish'?'To finish':grade==='hairpin'?`Hairpin ${side}`:`${side[0].toUpperCase()+side.slice(1)} ${grade}`;
  return {index,distance:distances[index],clips:[clip],text};
 });
}
export class PaceScheduler{
 private cursor=0;private progress=0;private until=0;
 constructor(readonly notes:PaceNote[]){}
 resync(distance:number){this.progress=distance;while(this.cursor<this.notes.length&&this.notes[this.cursor].distance<=distance+2)this.cursor++;this.until=0;}
 update(distance:number,speed:number,time:number):PaceNote|null{
  // Ignore nearest-point leaps across adjacent track segments and backwards travel.
  if(distance<this.progress-8||distance>this.progress+Math.max(12,speed*1.5))return null;
  this.progress=Math.max(this.progress,distance);
  while(this.cursor<this.notes.length&&this.notes[this.cursor].distance<distance-4)this.cursor++;
  if(time<this.until||speed<1)return null;
  const first=this.notes[this.cursor];if(!first||first.distance>distance+Math.max(10,speed*3))return null;
  this.cursor++;const result={...first,clips:[...first.clips]};
  const next=this.notes[this.cursor];
  if(next&&next.distance-first.distance<Math.max(14,speed*1.4)&&first.clips.length===1){result.clips.push(...next.clips);result.text+=`, into ${next.text.toLowerCase()}`;this.cursor++;}
  this.until=time+result.clips.length*1.7+.4;return result;
 }
}
