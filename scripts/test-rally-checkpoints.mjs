import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=compile(await readFile('components/rally/stages.ts','utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const {stages,stagePoints,checkpointIndices}=await import(uri(source));
const {advanceCheckpoints,forwardGateCrossing,CheckpointNotifications}=await import(uri(compile(await readFile('components/rally/checkpoints.ts','utf8'))));
test('all 24 routes accept centreline and wide on-road passes exactly once',()=>{
 for(const stage of stages.filter(s=>!['neon','mx'].includes(s.id)))for(const weather of stage.conditions)for(const reverse of [false,true])for(const offset of [0,4.5,-4.5]){
  const points=stagePoints({stage:stage.id,weather,reverse});
  const path=points.map((p,i)=>{const before=points[Math.max(0,i-1)],after=points[Math.min(650,i+1)],dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz);return {x:p.x+offset*dz/len,z:p.z-offset*dx/len};});
  let cursor=0;const events=[];
  for(let i=1;i<path.length;i++){const step=advanceCheckpoints(points,checkpointIndices,cursor,path[i-1],path[i],i*.04);cursor=step.cursor;events.push(...step.events);}
  assert.equal(cursor,18,`${stage.id} ${weather} reverse=${reverse} offset=${offset}`);
  assert.equal(events.length,18);assert.ok(events.every(e=>e.outcome==='accepted'),`${stage.id} ${reverse} unexpected miss`);
  assert.equal(new Set(events.map(e=>e.checkpoint)).size,18);
 }
});
test('swept checks catch frame gaps; backward or outside-width finish crossings do not finish',()=>{
 const points=Array.from({length:61},(_,z)=>({x:0,z})),indices=[20,40,60];
 assert.equal(advanceCheckpoints(points,indices,0,{x:0,z:10},{x:0,z:30},1).cursor,1);
 assert.equal(advanceCheckpoints(points,indices,2,{x:0,z:70},{x:0,z:50},1).finished,false);
 assert.equal(advanceCheckpoints(points,indices,2,{x:8,z:50},{x:8,z:70},1).finished,false);
 assert.ok(forwardGateCrossing({x:6.9,z:50},{x:6.9,z:70},points[60],points[59]));
});
test('snow shortcut no longer leaves timer waiting: finish emits missing checkpoints and a completion',()=>{
 for(const weather of ['clear','snow','fog'])for(const reverse of [false,true]){
  const points=stagePoints({stage:'alpine',weather,reverse}),end=points[650],dir=end.clone().sub(points[649]).normalize();
  const result=advanceCheckpoints(points,checkpointIndices,3,end.clone().addScaledVector(dir,-9),end.clone().addScaledVector(dir,2),70);
  assert.equal(result.finished,true);assert.equal(result.events.filter(e=>e.outcome==='missed').length,14);
  assert.equal(result.events.at(-1).checkpoint,18);
  assert.deepEqual(advanceCheckpoints(points,checkpointIndices,result.cursor,end,end,71).events,[]);
 }
});
test('leaving road alone is not a miss; later gate crossing explains missed sequence',()=>{
 const points=Array.from({length:61},(_,z)=>({x:0,z})),indices=[20,40,60];
 assert.deepEqual(advanceCheckpoints(points,indices,0,{x:15,z:0},{x:20,z:10},1).events,[]);
 const result=advanceCheckpoints(points,indices,0,{x:0,z:32},{x:0,z:42},2);
 assert.deepEqual(result.events.map(e=>e.outcome),['missed','accepted']);
 assert.equal(result.cursor,2);
});
test('notification stack groups misses, prioritises warnings, freezes on pause, expires and clears',()=>{
 const q=new CheckpointNotifications();q.push([{checkpoint:1,outcome:'accepted',time:5}]);
 q.tick(1);q.tick(10,true);assert.equal(q.items[0].remaining,1);q.tick(1.01);assert.equal(q.items.length,0);
 q.push([{checkpoint:2,outcome:'missed',time:10},{checkpoint:3,outcome:'missed',time:10},{checkpoint:4,outcome:'accepted',time:10}]);
 assert.deepEqual(q.items[0].checkpoints,[2,3]);assert.equal(q.items[0].duration,4);
 q.push([{checkpoint:5,outcome:'accepted',time:11}]);assert.equal(q.items.length,2);assert.equal(q.items[0].outcome,'missed');assert.equal(q.items[1].checkpoints[0],5);
 q.clear();assert.equal(q.items.length,0);
});
