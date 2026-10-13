import './rally-test-canvas.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';import {readFile} from 'node:fs/promises';import {moduleUrl} from './rally-test-loader.mjs';
const load=async p=>import(await moduleUrl(resolve(p))),S=await load('components/rally/stages.ts'),J=await load('components/rally/jumps.ts'),R=await load('components/rally/replay.ts'),V=await load('lib/rally/validation.ts'),B=await load('lib/rally/browse.ts'),A=await load('components/rally/atmosphere.ts');
test('special circuits close, validate ordered laps and retain legacy records',()=>{
 for(const stage of ['neon','mx'])for(const reverse of [false,true])for(const laps of [1,3,5]){
  const s={stage,weather:'clear',reverse,laps,circuitVersion:2},points=S.stagePoints(s);assert.ok(points[0].distanceTo(points.at(-1))<1e-8);assert.equal(S.lapCount(s),laps);assert.ok(S.compatibleCar(s,stage==='neon'?9:10));assert.equal(S.compatibleCar(s,0),false);assert.equal(S.validSelection({...s,track:2}),false);
  for(const weather of ['clear','rain','fog'])for(const timeOfDay of S.timesOfDay)assert.ok(S.validSelection({...s,weather,timeOfDay}));
  let t=0,trace=[[0,points[0].x,points[0].z]];for(let lap=0;lap<laps;lap++)for(let i=2;i<=650;i+=2){t+=points[i].distanceTo(points[i-2])/16;trace.push([t,points[i].x,points[i].z]);}
  t+=points[1].distanceTo(points[0])/16;trace.push([t,points[1].x,points[1].z]);
  assert.ok(V.validateRun(s,t,trace,t+1),`${stage}/${reverse}/${laps}`);assert.equal(V.validateRun(s,t,trace.slice(10),t+1),false);
  const finish=A.finishLayout(points);assert.ok(finish.approach.getPointAt(1).distanceTo(finish.center)<1e-6);
 }
 assert.equal(S.boardKey({stage:'forest',weather:'clear',reverse:false}),'v2:forest:clear:forward');assert.equal(S.boardKey({stage:'kart',weather:'clear',reverse:false,laps:3,circuitVersion:2}),'v3:kart:track1:forward:laps3');
 assert.equal(B.browseRequest(new URLSearchParams('stage=neon&car=10')).keys.length,0);assert.equal(B.browseRequest(new URLSearchParams('stage=mx&car=10')).keys.length,72);
});
test('motocross jumps have bidirectional clearance and continuous surfaces',()=>{
 for(const stage of ['mx','neon'])for(const reverse of [false,true]){const s={stage,weather:'clear',reverse,laps:3,circuitVersion:2},points=S.stagePoints(s),ramps=J.selectRamps(points,s);assert.ok(ramps.length>=(stage==='mx'?4:1));for(const ramp of ramps){const a=points[ramp.index-ramp.half*3],b=points[ramp.index+ramp.half*3];assert.ok(a&&b);assert.ok(a.distanceTo(b)>45);for(let i=ramp.index-ramp.half;i<ramp.index+ramp.half;i+=.25){const pose=J.elevationPose(i,25,false,ramps);assert.ok(pose.y>=J.rampHeight(i,ramps)-1e-8);assert.ok(Number.isFinite(pose.pitch));}}}
});
test('versioned special replays interpolate height and lean; legacy replays still load',()=>{
 const selection={stage:'mx',weather:'clear',reverse:false,laps:1,circuitVersion:2},r={version:2,car:10,selection,time:1,samples:[[0,0,0,0,1,.1,-.2],[1,1,2,.2,3,.3,.2]]};assert.ok(R.validReplay(r));const p=R.replayPose(r,.5);assert.equal(p.y,2);assert.equal(p.pitch,.2);assert.equal(p.roll,0);assert.equal(R.validReplay({...r,samples:[[0,0,0,0,99,0,0],r.samples[1]]}),false);assert.equal(R.validReplay({...r,samples:r.samples.map(s=>s.slice(0,4))}),false);assert.ok(R.validReplay({version:1,car:0,selection:{stage:'forest',weather:'clear',reverse:false},time:1,samples:[[0,0,0,0],[1,1,2,.2]]}));
});
test('special GLBs retain articulated parts within mobile budgets',async()=>{
 for(const [id,names] of [[9,['cockpit_anchor']],[10,['cockpit_anchor','wheel_front_left','wheel_rear_left','rider','handlebar']]]){const data=await readFile(`public/rally/${id===9?'v51':'v5'}/car-${id}.glb`),json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));assert.ok(data.length<300000);for(const name of names)assert.ok(json.nodes.some(n=>new RegExp('^'+name+'(?:[_.]?[0-9]+)?$').test(n.name)),name);const tris=json.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+json.accessors[p.indices].count/3,0);assert.ok(tris<15000);console.log(id,data.length,tris);}
});
test('special scenery and lighting stay bounded in every supported condition',async()=>{
 const {specialScenery}=await load('components/rally/special-scenery.ts'),{lighting}=await load('components/rally/conditions.ts');
 for(const stage of ['neon','mx'])for(const reverse of [false,true])for(const weather of ['clear','rain','fog'])for(const timeOfDay of S.timesOfDay){const selection={stage,weather,reverse,timeOfDay},p=lighting(selection);assert.ok(p.ambient>=.5);assert.ok(p.near<p.far);const scene=specialScenery(selection,S.stagePoints(selection),()=>false);let lights=0,meshes=0;scene.traverse(o=>{if(o.isLight)lights++;if(o.isMesh)meshes++;});assert.equal(lights,0);assert.ok(meshes<=(stage==='neon'?4:50));scene.traverse(o=>{if(o.isMesh)assert.ok(o.isInstancedMesh);});}
});
test('special previews and cockpit assets are complete and lightweight',async()=>{
 const {createHash}=await import('node:crypto');for(const stage of ['neon','mx']){const hashes=new Set();for(const suffix of ['weather-clear','weather-rain','weather-fog','time-sunrise','time-midday','time-sunset','time-night']){const b=await readFile(`public/rally/previews/${stage==='neon'?'v51':'v5'}/${stage}-1-${suffix}.webp`);assert.ok(b.length<180000);hashes.add(createHash('sha256').update(b).digest('hex'));}assert.ok(hashes.size>=6);}
 for(const type of ['rally','kart','hover','bike']){const b=await readFile(`public/rally/v5/${type}-cockpit.glb`);assert.ok(b.length<300000);}
});

test('Aster has full-width bars and exactly one shadow-free light in each direction',async()=>{
 const {addHoverLights,specialVehicle}=await load('components/rally/special-vehicle.ts');const root=specialVehicle(false),rear=addHoverLights(root,40),lights=root.children.filter(o=>o.isLight);assert.equal(lights.length,2);assert.ok(lights.every(l=>!l.castShadow&&l.position.x===0));assert.ok(lights.find(l=>l.name==='hover-front-light').target.position.z>0);assert.ok(rear.target.position.z<0);assert.equal(rear.userData.runningIntensity,6.4);assert.equal(root.getObjectByName('headlamp_front_bar').geometry.parameters.width,1.8);
 const b=await readFile('public/rally/v51/car-9.glb'),j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));for(const prefix of ['headlamp_front_bar','taillamp_rear_bar'])assert.equal(j.nodes.filter(n=>n.name?.startsWith(prefix)).length,1);assert.ok(j.materials.find(m=>m.name.startsWith('hover_paint')).pbrMetallicRoughness.baseColorFactor.slice(0,3).every(c=>c<.03));
});
