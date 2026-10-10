import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const uri=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const stageCode=compile(await readFile(new URL('../components/rally/stages.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const stageUri=uri(stageCode);
const {stages,stagePoints,boardKey,validSelection,surfaceGrip,timesOfDay,stageTimes}=await import(stageUri);
const replayCode=compile(await readFile(new URL('../components/rally/replay.ts',import.meta.url),'utf8')).replace("'./stages'",JSON.stringify(stageUri));
const replayUri=uri(replayCode);
const {validReplay,replayPose,matchingReplay,checkpointSplits}=await import(replayUri);
const checkpointUri=uri(compile(await readFile(new URL('../components/rally/checkpoints.ts',import.meta.url),'utf8')));
const validation=compile(await readFile(new URL('../lib/rally/validation.ts',import.meta.url),'utf8')).replace("'../../components/rally/stages'",JSON.stringify(stageUri)).replace('"../../components/rally/replay"',JSON.stringify(replayUri)).replace("'../../components/rally/checkpoints'",JSON.stringify(checkpointUri));
const {validateRun,validName,replayAgrees}=await import(uri(validation));
test('294 unique configurations, reversed endpoints, bounded roads and valid completion traces',()=>{
 const keys=new Set();
 for(const stage of stages) for(const weather of stage.conditions) for(const reverse of [false,true]) for(const timeOfDay of stageTimes(stage.id)) for(const track of [1,2,3]) {
  const selection={stage:stage.id,weather,reverse,timeOfDay,track};
  assert.ok(validSelection(selection));keys.add(boardKey(selection));
  const points=stagePoints(selection),opposite=stagePoints({...selection,reverse:!reverse});
  assert.ok(points[0].distanceTo(opposite.at(-1))<.001);
  assert.ok(points.every(p=>Math.abs(p.x)<79 && Math.abs(p.z)<74));
  let time=.01;const trace=[[time,points[0].x,points[0].z]];
  for(let i=1;i<points.length;i++) {time+=points[i].distanceTo(points[i-1])/12; trace.push([time,points[i].x,points[i].z]);}
  assert.ok(validateRun(selection,time,trace,time+3),`${stage.id} ${weather} ${reverse}`);
  assert.equal(validateRun(selection,time,trace.slice(50),time+3),false);
  assert.equal(validateRun(selection,time,trace,time-4),false);
 }
 assert.equal(keys.size,294);
});
test('reject invalid conditions and names; wet roads reduce grip',()=>{
 assert.equal(validSelection({stage:'desert',weather:'snow',reverse:false}),false);
 assert.equal(validName('<script>'),false);assert.ok(validName('Mark 82'));
 assert.ok(surfaceGrip({stage:'forest',weather:'rain',reverse:false})<surfaceGrip({stage:'forest',weather:'clear',reverse:false}));
});

const atmosphereCode=compile(await readFile(new URL('../components/rally/atmosphere.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const {Atmosphere,finishLayout,fanProgress}=await import(uri(atmosphereCode));
test('finish areas follow all endpoints; crowd remains outside roads and arrival corridor',()=>{
 for(const stage of stages)for(const weather of stage.conditions)for(const reverse of [false,true])for(const track of [1,2,3]){
  const points=stagePoints({stage:stage.id,weather,reverse,track}),atmosphere=new Atmosphere(points);
  const layout=finishLayout(points),sin=Math.sin(layout.angle),cos=Math.cos(layout.angle);
  for(const p of points){const x=p.x-layout.center.x,z=p.z-layout.center.z;
   const clearance=Math.hypot(Math.max(0,Math.abs(x*cos-z*sin)-8.5),Math.max(0,Math.abs(x*sin+z*cos)-9));
   assert.ok(clearance>=8,stage.id+' apron covers racing road');
  }
  for(const p of layout.approach.getPoints(80))assert.ok(points.slice(0,-35).every(q=>p.distanceTo(q)>7.8),stage.id+' arrival crosses another road');
  assert.equal(atmosphere.spectators.length,36);
  for(const person of atmosphere.spectators){
   assert.equal(atmosphere.reserved(person.x,person.z),false,stage.id+' arrival corridor');
   assert.ok(points.every(p=>Math.hypot(p.x-person.x,p.z-person.z)>7),stage.id+' crowd on road');
  }
  atmosphere.celebrate();atmosphere.update(.1,1);atmosphere.reset();assert.equal(atmosphere.confetti.visible,false);
 }
});
test('replay interpolation uses short angle path, rejects corrupt and mismatched records',()=>{
 const selection={stage:'forest',weather:'clear',reverse:false};
 const replay={version:1,car:0,selection,time:1,samples:[[0,0,0,3.1],[1,10,5,-3.1]]};
 assert.ok(validReplay(replay));
 assert.equal(validReplay({...replay,time:601}),false);
 assert.equal(validReplay({...replay,samples:Array(2601).fill([0,0,0,0])}),false);
 assert.equal(validReplay({...replay,samples:[[0,0,0,0],[.8,0,0,0],[.5,0,0,0],[1,0,0,0]]}),false);
 assert.equal(matchingReplay(replay,selection,0,.9),false);assert.ok(Math.abs(replayPose(replay,.5).angle-Math.PI)<.001);
 assert.equal(replayPose(replay,.5).x,5);assert.equal(replayPose(replay,1.1),null);
 assert.equal(matchingReplay(replay,{...selection,reverse:true},0),false);
 assert.equal(matchingReplay(replay,selection,1),false);
 assert.equal(validReplay({...replay,samples:[[0,0,0,NaN],[1,0,0,0]]}),false);
 assert.ok(replayAgrees(replay,selection,0,1,[[0,0,0],[1,10,5]]));
 assert.equal(replayAgrees(replay,selection,0,1,[[0,0,0],[1,11,5]]),false);
});

test('fans venture out only with a clear road and retreat before a fast approaching car',()=>{
 let progress=0;
 for(let i=0;i<180;i++)progress=fanProgress(progress,12,120,27,1/30,true);
 assert.ok(progress>0.999);
 let distance=100;
 while(distance>20){progress=fanProgress(progress,12,distance,27,1/30,true);distance-=27/30;if(distance<45)assert.equal(progress,0);}
 assert.equal(fanProgress(1,20,12,0,1/60,true),0);
 assert.equal(fanProgress(.5,12,120,0,0,true),.5);
 const a=new Atmosphere(stagePoints({stage:'forest',weather:'clear',reverse:false}));
 assert.ok(a.spectators.some(p=>p.excursion));
 a.update(2,2,new (a.layout.center.constructor)(500,0,500),0,true);
 assert.ok(a.spectators.some(p=>p.progress>0));
 a.reset();assert.ok(a.spectators.every(p=>p.progress===0));
 a.reduced=true;a.update(2,4,new (a.layout.center.constructor)(500,0,500),0,true);
 assert.ok(a.spectators.every(p=>p.progress===0));
});

test('legacy records stay midday; lighting records and ghosts never cross boards',()=>{
 const selection={stage:'forest',weather:'clear',reverse:false};
 assert.equal(boardKey(selection),boardKey({...selection,timeOfDay:'midday'}));
 assert.notEqual(boardKey(selection),boardKey({...selection,timeOfDay:'night'}));
 assert.equal(validSelection({...selection,timeOfDay:'noon'}),false);
 const replay={version:1,car:0,selection,time:1,samples:[[0,0,0,0],[1,0,0,0]]};
 assert.equal(matchingReplay(replay,{...selection,timeOfDay:'midday'},0),true);
 assert.equal(matchingReplay(replay,{...selection,timeOfDay:'night'},0),false);
});
test('reference splits interpolate checkpoint entry once and survive legacy recordings',()=>{
 const selection={stage:'forest',weather:'clear',reverse:false},points=stagePoints(selection);
 const samples=points.map((p,i)=>[i*.1,p.x,p.z,0]);
 const splits=checkpointSplits({version:1,car:0,selection,time:65,samples});
 assert.equal(splits.length,18);assert.ok(splits.every(Number.isFinite));
 for(let i=1;i<18;i++)assert.ok(splits[i]>splits[i-1]);
 assert.ok(splits[0]>0&&splits.at(-1)<=65);
});
