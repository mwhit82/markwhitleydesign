import './rally-test-canvas.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const cache=new Map();
async function moduleUrl(path){
 if(cache.has(path))return cache.get(path);
 let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from ["']([^"']+)["']/g)]){const spec=match[1],url=spec.startsWith('.')?await moduleUrl(resolve(dirname(path),spec+'.ts')):import.meta.resolve(spec);code=code.replace(match[0],`from '${url}'`);}
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(path,url);return url;
}
const {stagePoints,boardKey,lapCount,stages,stageTimes,checkpointIndices,validSelection}=await import(await moduleUrl(resolve('components/rally/stages.ts')));
const {advanceCheckpoints}=await import(await moduleUrl(resolve('components/rally/checkpoints.ts')));
const {validateRun}=await import(await moduleUrl(resolve('lib/rally/validation.ts')));
const {finishLayout,Atmosphere}=await import(await moduleUrl(resolve('components/rally/atmosphere.ts')));
const {bridgeIndices}=await import(await moduleUrl(resolve('components/rally/scenery.ts')));
const {browseRequest}=await import(await moduleUrl(resolve('lib/rally/browse.ts')));
test('all 18 kart circuit races close, count laps once and validate without changing legacy keys',()=>{
 for(const track of [1,2,3])for(const reverse of [false,true])for(const laps of [1,3,5]){
  const selection={stage:'kart',weather:'clear',reverse,track,laps,circuitVersion:2};
  assert.ok(validSelection(selection));assert.equal(lapCount(selection),laps);
  const points=stagePoints(selection);assert.ok(points[0].distanceTo(points.at(-1))<1e-8);
  assert.notEqual(boardKey(selection),boardKey({...selection,circuitVersion:undefined,laps:undefined}));
  let cursor=0,completed=0,time=0,previous=points[0],trace=[[0,previous.x,previous.z]],events=0;
  const positions=[];for(let lap=0;lap<laps;lap++)positions.push(...points.slice(1));positions.push(points[1]);
  for(const p of positions){time+=p.distanceTo(previous)/12;const passage=advanceCheckpoints(points,checkpointIndices,cursor,previous,p,time,true);events+=passage.events.length;assert.ok(passage.events.every(e=>e.outcome==='accepted'));
   cursor=passage.cursor;trace.push([time,p.x,p.z]);previous=p;
   if(passage.finished){completed++;if(completed<laps)cursor=0;else break;}
  }
  assert.equal(completed,laps);assert.equal(events,18*laps);
  // Production trace is 4Hz; resample from the driven centreline for server validation.
  const sampled=[trace[0]];for(const row of trace.slice(1,-1))if(row[0]-sampled.at(-1)[0]>=.25)sampled.push(row);sampled.push(trace.at(-1));
  assert.ok(validateRun(selection,time,sampled,time+3),`${track}/${reverse}/${laps}`);
  if(laps>1)assert.equal(validateRun(selection,time,sampled.slice(0,Math.floor(sampled.length/laps)),time+3),false);
  const layout=finishLayout(points);assert.ok(layout.center.distanceTo(points[0])>20);
 }
 assert.equal(validSelection({stage:'kart',weather:'clear',reverse:false,laps:2,circuitVersion:2}),false);
 assert.equal(browseRequest(new URLSearchParams('stage=kart&laps=5')).keys.length,96);
});
test('closed-circuit start crossing cannot finish and missing a later gate makes the lap practice',()=>{
 const p=stagePoints({stage:'kart',weather:'clear',reverse:false,circuitVersion:2});
 assert.equal(advanceCheckpoints(p,checkpointIndices,0,p[649],p[1],1,true).finished,false);
 const allMissed=advanceCheckpoints(p,checkpointIndices,0,p[649],p[1],20,true,true);assert.ok(allMissed.finished);assert.equal(allMissed.events.filter(e=>e.outcome==='missed').length,17);
 const passed=advanceCheckpoints(p,checkpointIndices,1,p[649],p[1],20,true);
 assert.ok(passed.finished);assert.ok(passed.events.some(e=>e.outcome==='missed'));
});
test('all route bridges clear other road sections and finish crowds have safe retreat positions',()=>{
 for(const stage of stages.filter(s=>!['nyc','neon','mx'].includes(s.id)))for(const track of [1,2,3])for(const reverse of [false,true]){
  const points=stagePoints({stage:stage.id,weather:'clear',track,reverse,...(stage.id==='kart'?{circuitVersion:2}:{})}),a=new Atmosphere(points);
  assert.equal(a.spectators.filter(p=>p.finish).length,36);
  assert.equal(a.spectators.filter(p=>p.photo).length,24);
  for(const person of a.spectators){assert.ok(points.every(p=>Math.hypot(p.x-person.x,p.z-person.z)>7));assert.ok(a.layout.approach.getPoints(24).every(p=>Math.hypot(p.x-person.x,p.z-person.z)>6.8));}
  for(const i of bridgeIndices(points,(x,z)=>a.reserved(x,z))){const p=points[i],d=points[i+4].clone().sub(points[i-4]).normalize();for(const side of [-1,1])assert.ok(points.every(q=>Math.hypot(q.x-(p.x+d.z*7.8*side),q.z-(p.z-d.x*7.8*side))>6.9));}
 }
});
test('road relief adds bounded local geometry with continuous texture coordinates',async()=>{
 const {roadRelief}=await import(await moduleUrl(resolve('components/rally/road-relief.ts')));
 for(const stage of stages.filter(s=>!['kart','nyc','neon','mx'].includes(s.id)))for(const track of [1,2,3])for(const reverse of [false,true]){
  const {road,earth}=roadRelief(stagePoints({stage:stage.id,track,reverse,weather:'clear'}));
  assert.ok(road.attributes.position.count<600);assert.ok(earth.attributes.position.count<600);
  for(const mesh of [road,earth]){const p=mesh.attributes.position,u=mesh.attributes.uv;for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getZ(i)));assert.ok(Math.abs(u.getX(i)-(p.getX(i)+85)/170)<1e-6);assert.ok(Math.abs(u.getY(i)-(p.getY(i)+80)/160)<1e-6);}mesh.dispose();}
 }
});
