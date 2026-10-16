import type { RoomState } from './room';
import { VISITORS } from './visitors';
import { SEATS } from './lounge';
export type Rehearsal = 'standard'|'lounge'|'scare'|'armed'|'judgement-pass'|'judgement-fail';
/** Development-only caller; sessions retain the no-reward 60-second duration. */
export function rehearse(room:RoomState,scenario:Rehearsal):RoomState {
  if(room.night?.duration!==60||scenario==='standard')return room;
  const id=`${room.encounters.runId}:fixture`;
  if(scenario==='judgement-pass'||scenario==='judgement-fail')return {...room,night:{...room.night,elapsed:599},encounters:{...room.encounters,mistakes:scenario==='judgement-fail'?3:2}};
  if(scenario==='armed')return {...room,weapon:{...room.weapon,collected:true},door:'OPEN',visitorId:id,encounters:{...room.encounters,active:{id,visitor:'three',phase:'waiting',elapsed:0,asked:[],decision:null}}};
  if(scenario==='scare')return {...room,door:'VISITOR_WAITING',visitorId:id,view:'door',encounters:{...room.encounters,active:{id,visitor:'three',phase:'waiting',elapsed:0,asked:[],decision:null}}};
  const humans=VISITORS.filter(v=>v.kind==='human');
  return {...room,residents:SEATS.map((_,seat)=>({id:`${id}:${seat}`,visitor:humans[seat%humans.length].id,seat,phase:'seated',elapsed:8}))};
}
