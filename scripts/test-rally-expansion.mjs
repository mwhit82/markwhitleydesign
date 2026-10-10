import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import ts from 'typescript';import * as T from 'three';
const cache=new Map();async function load(path){if(cache.has(path))return cache.get(path);let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const m of [...code.matchAll(/from ["']([^"']+)["']/g)])code=code.replace(m[0],`from '${m[1].startsWith('.')?await load(resolve(dirname(path),m[1]+'.ts')):import.meta.resolve(m[1])}'`);const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(path,url);return url;}
const {stages,stagePoints,boardKey,validSelection,compatibleCar}=await import(await load(resolve('components/rally/stages.ts')));
const {surfaceAccumulation,createSnow}=await import(await load(resolve('components/rally/surface-effects.ts')));
const {elevationPose,rampHeight,StageScenery}=await import(await load(resolve('components/rally/scenery.ts')));
const {RallyAudio}=await import(await load(resolve('components/rally/audio.ts')));
test('legacy routes and keys are retained; new routes are distinct; kart is isolated',()=>{
 for(const stage of stages){const base={stage:stage.id,weather:'clear',reverse:false};assert.equal(boardKey(base),boardKey({...base,track:1}));assert.notEqual(boardKey(base),boardKey({...base,track:2}));const routes=[1,2,3].map(track=>stagePoints({...base,track}));for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(routes[i].some((p,k)=>p.distanceTo(routes[j][k])>12));}
 assert.ok(compatibleCar({stage:'kart'},8));assert.equal(compatibleCar({stage:'kart'},0),false);assert.equal(compatibleCar({stage:'forest'},8),false);for(let i=0;i<8;i++)assert.ok(compatibleCar({stage:'forest'},i));
 for(const track of [0,4,'2',NaN])assert.equal(validSelection({stage:'forest',weather:'clear',reverse:false,track}),false);
 assert.equal(validSelection({stage:'kart',weather:'rain',reverse:false}),false);assert.equal(validSelection({stage:'kart',weather:'clear',reverse:false,timeOfDay:'night'}),false);
});
test('buildup responds to surface, rain and snowfall, remains bounded and pauses',()=>{
 const base={stage:'forest',weather:'clear',reverse:false};const dry=surfaceAccumulation(base,20,20,0,0),wet=surfaceAccumulation({...base,weather:'rain'},20,20,0,0);assert.ok(wet.mud>dry.mud);
 const snow=surfaceAccumulation({...base,stage:'alpine',weather:'snow'},20,20,0,0);assert.ok(snow.snow>0&&snow.mud<dry.mud);assert.deepEqual(surfaceAccumulation(base,0,20,.4,.3),{mud:.4,snow:.3});assert.deepEqual(surfaceAccumulation({...base,stage:'kart'},20,20,0,0),{mud:0,snow:0});assert.equal(surfaceAccumulation({...base,stage:'alpine',weather:'snow'},999,25,0,0).snow,1);assert.equal(createSnow().count,48);
});
test('three crests are continuous, bounded and reverse-symmetric; stationary cars stay grounded',()=>{
 for(let i=0;i<=650;i+=.25){const p=elevationPose(i,25),slow=elevationPose(i,0);assert.ok(Number.isFinite(p.y)&&p.y>=0&&p.y<4.5);assert.equal(slow.y,rampHeight(i));assert.ok(Math.abs(rampHeight(i)-rampHeight(650-i))<1e-9);assert.equal(elevationPose(i,25,true).roll,0);}
 for(const i of [135,325,515])assert.ok(elevationPose(i+7,25).y>rampHeight(i+7));
});
test('finish crowd profiles distinguish practice, clean completion and personal best',()=>{
 const audio=Object.create(RallyAudio.prototype);audio.finishResult(false,false);const practice=[audio.finishGain,audio.finishDuration];audio.finishResult(true,false);const clean=[audio.finishGain,audio.finishDuration];audio.finishResult(true,true);assert.ok(audio.finishGain>clean[0]&&clean[0]>practice[0]);assert.ok(audio.finishDuration>clean[1]&&clean[1]>practice[1]);
});
test('scenery allocation is bounded; indoor has no birds or ramps; pause freezes flight',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
 for(const stage of stages){const selection={stage:stage.id,weather:'clear',reverse:false},scenery=new StageScenery(selection,stagePoints(selection),()=>false);assert.ok(scenery.group.children.length<40);scenery.update(1,false);const clock=scenery.clock;scenery.update(0,false);assert.equal(scenery.clock,clock);if(stage.id==='kart')assert.equal(scenery.birds,null);else assert.equal(scenery.birds.count,16);scenery.group.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});}
});
