import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
import * as T from 'three';
const cache=new Map();
async function moduleUrl(path){
 if(cache.has(path))return cache.get(path);
 let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from ["']([^"']+)["']/g)]){
  const spec=match[1],url=spec.startsWith('.')?await moduleUrl(resolve(dirname(path),spec+'.ts')):import.meta.resolve(spec);
  code=code.replace(match[0],`from '${url}'`);
 }
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(path,url);return url;
}
const {RallyWorld}=await import(await moduleUrl(resolve('components/rally/world.ts')));
const {replayKey}=await import(await moduleUrl(resolve('components/rally/replay.ts')));
const {CheckpointNotifications}=await import(await moduleUrl(resolve("components/rally/checkpoints.ts")));
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
function fixture(best=null,clean=true){
 const w=Object.create(RallyWorld.prototype);let finishes=0;
 Object.assign(w,{haptics:{stop(){}},mode:'race',reasons:[],notifications:new CheckpointNotifications(),time:60,trace:[[0,0,0],[60,1,1]],replaySamples:[[0,0,0,0],[60,1,1,0]],cleanRun:clean,best,selected:0,selection:{stage:'forest',weather:'clear',reverse:false},vehicle:new T.Group(),velocity:new T.Vector3(),angle:0,arrivalFrom:new T.Vector3(),keys:new Set(),root:new T.Group(),ghostGeneration:0,ghostSource:'personal',disposed:false,ghostCar:null,ghostAbort:null,ghostReplay:null,callbacks:{mode(){},best(){},finish(){finishes++},ghost(s){w.status=s}},atmosphere:{layout:{center:new T.Vector3(2,0,2),angle:1},celebrate(){},reset(){}}});
 w.finishCount=()=>finishes;return w;
}
test('completion freezes recording once; skip does not resubmit; clean PB replacement and legacy times',async()=>{
 memory.clear();const w=fixture();w.completeRun();const replay=JSON.parse(memory.get(replayKey(w.selection,0)));
 assert.equal(w.finishCount(),1);assert.equal(w.mode,'celebrating');assert.equal(w.time,60);assert.equal(replay.samples.at(-1)[0],60);assert.equal(replay.samples.length,2);
 w.completeRun();w.skipCelebration();w.skipCelebration();assert.equal(w.finishCount(),1);assert.equal(w.time,60);assert.equal(w.mode,'finished');
 const slower=fixture(55);slower.completeRun();assert.equal(slower.best,55);assert.equal(memory.get(replayKey(w.selection,0)),JSON.stringify(replay));
 memory.clear();const legacy=fixture(55);legacy.mode='garage';await legacy.prepareGhost();assert.match(legacy.status,/new best/);assert.equal(legacy.best,55);
 const practice=fixture(null,false);practice.completeRun();assert.equal(practice.best,null);assert.equal(memory.size,0);
});
test('failed ghost download never changes race availability; downloaded rival is fixed once start begins',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{throw Error('offline')};const w=fixture();w.mode='garage';w.ghostSource='leader';await w.prepareGhost();assert.match(w.status,/unavailable/);assert.equal(w.mode,'garage');
  let resolveFetch;globalThis.fetch=()=>new Promise(r=>resolveFetch=r);const pending=w.prepareGhost();w.mode='countdown';w.ghostGeneration++;
  resolveFetch({ok:true,json:async()=>({name:'Late rival',replay:{version:1,car:0,selection:w.selection,time:60,samples:[[0,0,0,0],[60,1,1,0]]}})});
  await pending;assert.equal(w.ghostReplay,null);
 }finally{globalThis.fetch=original;}
});
test('missed gates and recovery explicitly block PB/replay; pausing preserves countdown',()=>{
 memory.clear();const w=fixture();w.markPractice('missed-checkpoint');w.markPractice('missed-checkpoint');w.markPractice('car-recovered');
 let outcome;w.callbacks.finish=(time,trace,replay,eligibility)=>{outcome=eligibility;assert.equal(trace.length,0);assert.equal(replay,undefined);};
 w.completeRun();assert.equal(w.best,null);assert.deepEqual(outcome,{eligible:false,reasons:['missed-checkpoint','car-recovered']});assert.equal(memory.size,0);
 const countdown=fixture();countdown.muted=true;countdown.mode='countdown';countdown.countdown=2;countdown.pause();assert.equal(countdown.mode,'paused');countdown.pause();assert.equal(countdown.mode,'countdown');assert.equal(countdown.countdown,2);
});

test('recovery adds exactly 1.5 seconds, stays practice-only and cannot change a finished result',()=>{
 const w=fixture(55);w.recoveryPenalty=0;w.points=[new T.Vector3(1,0,2),new T.Vector3(1,0,3),new T.Vector3(1,0,4),new T.Vector3(1,0,5)];w.checkpoint=0;w.callbacks.pad=()=>{};
 w.resetPosition();assert.equal(w.time,61.5);assert.equal(w.recoveryPenalty,1.5);w.resetPosition();assert.equal(w.time,63);assert.equal(w.recoveryPenalty,3);
 w.completeRun();assert.equal(w.best,55);assert.equal(w.cleanRun,false);w.resetPosition();assert.equal(w.time,63);
});

test('V4 failed and stale vehicle downloads retain the current playable model',async()=>{
 const original=globalThis.fetch;
 try{
  const w=fixture();w.mode='garage';w.visualGeneration=2;w.host={dataset:{}};const fallback=w.vehicle;
  globalThis.fetch=async()=>{throw Error('offline')};await w.installVehicle(2,2,fallback);assert.equal(w.vehicle,fallback);assert.equal(w.mode,'garage');
  const bytes=await readFile('public/rally/v4/car-1.glb');globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  await w.installVehicle(1,1,fallback);assert.equal(w.vehicle,fallback);assert.equal(w.host.dataset.visualModel,undefined);
  w.mode='race';await w.installVehicle(1,2,fallback);assert.equal(w.vehicle,fallback);assert.equal(w.mode,'race');
 }finally{globalThis.fetch=original;}
});
