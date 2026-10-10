import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const uri=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const stageCode=compile(await readFile(new URL('../components/rally/stages.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const stageUri=uri(stageCode);
const {stages,stagePoints,boardKey,validSelection,surfaceGrip}=await import(stageUri);
const replayCode=compile(await readFile(new URL('../components/rally/replay.ts',import.meta.url),'utf8')).replace("'./stages'",JSON.stringify(stageUri));
const replayUri=uri(replayCode);
const {validReplay,replayPose,matchingReplay}=await import(replayUri);
const checkpointUri=uri(compile(await readFile(new URL('../components/rally/checkpoints.ts',import.meta.url),'utf8')));
const validation=compile(await readFile(new URL('../lib/rally/validation.ts',import.meta.url),'utf8')).replace("'../../components/rally/stages'",JSON.stringify(stageUri)).replace('"../../components/rally/replay"',JSON.stringify(replayUri)).replace("'../../components/rally/checkpoints'",JSON.stringify(checkpointUri));
const {validateRun,validName,replayAgrees}=await import(uri(validation));
test('24 unique configurations, reversed endpoints, bounded roads and valid completion traces',()=>{
 const keys=new Set();
 for(const stage of stages) for(const weather of stage.conditions) for(const reverse of [false,true]) {
  const selection={stage:stage.id,weather,reverse};
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
 assert.equal(keys.size,24);
});
test('reject invalid conditions and names; wet roads reduce grip',()=>{
 assert.equal(validSelection({stage:'desert',weather:'snow',reverse:false}),false);
 assert.equal(validName('<script>'),false);assert.ok(validName('Mark 82'));
 assert.ok(surfaceGrip({stage:'forest',weather:'rain',reverse:false})<surfaceGrip({stage:'forest',weather:'clear',reverse:false}));
});

const atmosphereCode=compile(await readFile(new URL('../components/rally/atmosphere.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const {Atmosphere,finishLayout}=await import(uri(atmosphereCode));
test('finish areas follow all endpoints; crowd remains outside roads and arrival corridor',()=>{
 for(const stage of stages)for(const weather of stage.conditions)for(const reverse of [false,true]){
  const points=stagePoints({stage:stage.id,weather,reverse}),atmosphere=new Atmosphere(points);
  assert.ok(Math.abs(finishLayout(points).center.distanceTo(points.at(-1))-11)<.001);
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
