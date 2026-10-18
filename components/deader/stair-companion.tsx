"use client";
import {useEffect} from 'react';
import {useGame} from '@/lib/deader/store';
import {encounterVisitor} from '@/lib/deader/visitors';
import {VisitorCone} from './visitor-cone';
import {roomAudio} from '@/lib/deader/audio/room-audio';
import {roomPlayerPose} from './player-reflection';
export function StairCompanion(){
 const e=useGame(s=>s.room.encounters),paused=useGame(s=>!!s.panel||!s.focused||!!s.suspension);
 const fallen=!!e.pair?.fallen;
 useEffect(()=>{if(fallen)roomAudio.scream(-.5,-8,roomPlayerPose);},[fallen]);
 if(!e.queued||!e.pair)return null;
 const t=Math.max(0,e.pair.elapsed-3);
 if(fallen&&t>1)return null;
 const progress=Math.min(1,e.pair.elapsed/9);
 return <group position={[-.5,fallen?-t*3:-.3,-9+progress*2]} rotation={[0,0,fallen?t*2:0]}>
  <VisitorCone visitor={encounterVisitor(e.queued)} walking={!fallen} paused={paused}/>
 </group>;
}
