import { freshStalker } from "./stalker";
import type { RoomState } from './room';
import { VISITORS, generatedVisitor, type DawnEntry } from './visitors';
import { SEATS } from './lounge';
export type Rehearsal = 'stalker-room'|'stalker-follow'|'stalker-cam-0'|'stalker-cam-1'|'stalker-cam-2'|'stalker-cam-3'|'stalker-cam-4'|'stalker-cam-5'|'armed-mirror'|'standard'|'lounge'|'scare'|'armed'|'judgement-pass'|'judgement-fail'|'mimic'|'splitter'|'glitched'|'kids'|'pair'|'push'|'rainbow'|'injured';
/** Development-only caller; sessions retain the no-reward 60-second duration. */
export function rehearse(room:RoomState,scenario:Rehearsal):RoomState {
  if(room.night?.duration!==60||scenario==='standard')return room;
  const id=`${room.encounters.runId}:fixture`;
  if(scenario.startsWith('stalker-')) {
    const feed=scenario.startsWith('stalker-cam-')?Number(scenario.slice(-1)):0;
    return {...room,view:scenario==='stalker-room'?'explore':'cctv',feed:feed as RoomState['feed'],stalker:{...freshStalker(),phase:scenario==='stalker-room'?'room':'camera',feed,anchor:0,follow:scenario==='stalker-follow'}};
  }

  if(scenario==='judgement-pass'||scenario==='judgement-fail'){
    const ledger:DawnEntry[]=['bea','three','glitched','kids','mimic'].map((type,i)=>({id:`${id}:${i}`,profile:generatedVisitor(type,1234,i),decision:i===2?'shoot':'admit',coins:5,shot:i===2}));
    return {...room,night:{...room.night,elapsed:599},encounters:{...room.encounters,ledger,mistakes:scenario==='judgement-fail'?3:2}};
  }
  if(scenario==='armed-mirror')return {...room,weapon:{...room.weapon,collected:true}};
  if(scenario==='armed')return {...room,weapon:{...room.weapon,collected:true},door:'OPEN',visitorId:id,encounters:{...room.encounters,active:{id,visitor:'three',phase:'waiting',elapsed:0,asked:[],decision:null}}};
  if(scenario==='scare')return {...room,door:'VISITOR_WAITING',visitorId:id,view:'door',encounters:{...room.encounters,active:{id,visitor:'three',phase:'waiting',elapsed:0,asked:[],decision:null}}};
  if(['mimic','splitter','glitched','kids','pair','push'].includes(scenario)){
    const type=scenario==='pair'?'bea':scenario==='push'?'mean':scenario;
    const profile=generatedVisitor(type,1234,0);
    const active={id,visitor:type,profile,phase:scenario==='pair'||scenario==='push'?'approaching' as const:'waiting' as const,elapsed:0,asked:[],decision:null};
    return {...room,view:scenario==='pair'||scenario==='push'?'cctv':scenario==='mimic'?'explore':'inspect',feed:2,door:active.phase==='waiting'?'VISITOR_WAITING':'CLOSED',visitorId:active.phase==='waiting'?id:null,
      residents:scenario==='mimic'?[{id:id+':mimic',visitor:'mimic',profile,seat:0,phase:'seated',elapsed:8,mimicStage:2,mimicSeen:[]},{id:id+':human',visitor:'bea',seat:1,phase:'seated',elapsed:8}]:[],
      encounters:{...room.encounters,active:scenario==='mimic'?{...active,visitor:'bea',profile:generatedVisitor('bea',1234,1)}:active,
      queued:scenario==='pair'||scenario==='push'?{...active,id:id+':second',visitor:'pippa',profile:generatedVisitor('pippa',1234,1)}:null,
      pair:scenario==='pair'||scenario==='push'?{elapsed:0,push:scenario==='push',fallen:false}:undefined}};
  }
  if(scenario==='rainbow'||scenario==='injured')return {...room,previewBundle:scenario};
  const humans=VISITORS.filter(v=>v.kind==='human');
  return {...room,residents:SEATS.map((_,seat)=>({id:`${id}:${seat}`,visitor:humans[seat%humans.length].id,seat,phase:'seated',elapsed:8}))};
}
