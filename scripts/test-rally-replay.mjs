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

test('countdown preserves held throttle and steering; pause still clears them',()=>{const w=fixture();w.mode='countdown';w.keys.add('KeyW');w.keys.add('KeyA');w.touchHeld=true;w.touchSteer=-1;w.setMode('race');assert.equal(w.keys.has('KeyW'),true);assert.equal(w.keys.has('KeyA'),true);assert.equal(w.touchSteer,-1);w.setMode('paused');assert.equal(w.keys.size,0);assert.equal(w.touchSteer,0);});
test('spatial route lookup matches original nearest points across all route shapes',async()=>{const {RouteIndex}=await import(await moduleUrl(resolve('components/rally/route-index.ts')));const S=await import(await moduleUrl(resolve('components/rally/stages.ts')));for(const stage of S.stages.filter(s=>!['neon','mx'].includes(s.id)))for(const track of stage.id==='nyc'?[1]:[1,2,3])for(const reverse of [false,true]){const points=S.stagePoints({stage:stage.id,track,weather:'clear',reverse}),index=new RouteIndex(points);for(let x=-100;x<=100;x+=13)for(let z=-100;z<=100;z+=17){const expected=points.reduce((best,p,i)=>{const distance=Math.hypot(p.x-x,p.z-z);return distance<best.distance?{index:i,distance}:best;},{index:0,distance:Infinity}),actual=index.nearest(x,z);assert.equal(actual.index,expected.index);assert.ok(Math.abs(actual.distance-expected.distance)<1e-10);}}});
test('wheel steering preserves authored base transform and turns with vehicle heading',async()=>{const {VehicleVisual}=await import(await moduleUrl(resolve('components/rally/vehicle-visual.ts')));const group=new T.Group(),wheel=new T.Group();wheel.name='wheel_front_left';wheel.rotation.z=.2;wheel.add(new T.Group());group.add(wheel);const base=wheel.quaternion.clone(),visual=new VehicleVisual(group).bind();visual.update(.1,10,1,false,false);const delta=base.clone().invert().multiply(wheel.quaternion),forward=new T.Vector3(0,0,1).applyQuaternion(delta);assert.ok(forward.x<0);visual.update(0,0,0,false,false);assert.ok(wheel.quaternion.angleTo(base)<1e-7);});
test('60 Hz pacing retains deadlines on jittered 60/90/120 Hz displays',async()=>{const {pacedFrame}=await import(await moduleUrl(resolve('components/rally/frame-pacing.ts')));for(const hz of [60,90,120]){let previous=0,count=0;const times=[];for(let i=1;i<=hz*10;i++){const now=i*1000/hz+Math.sin(i)*.15,next=pacedFrame(now,previous,1000/60);if(next!==null){previous=next;count++;times.push(now);}}assert.ok(count>=599&&count<=601,`${hz}: ${count}`);const gaps=times.slice(1).map((t,i)=>t-times[i]);assert.ok(Math.max(...gaps)<(hz===90?23:18));}});
test('preparation waits, reuses a matching setup, cancels obsolete work and tolerates optional failures',async()=>{
 const w=fixture();let load,compiles=0,starts=0;Object.assign(w,{mode:'garage',preparationId:0,preparedKey:'',preparation:null,modelPending:new Promise(r=>load=r),driverCamera:{prepare:async()=>{},cockpit:{visible:false},camera:new T.Camera()},renderer:{compileAsync:async()=>{compiles++},render(){}},camera:new T.Camera(),scene:new T.Scene(),rivals:{prewarm(){},hidePool(){}},prepareGhost:async()=>{throw Error('optional ghost offline')},ensureAudio:async()=>{throw Error('audio blocked')},start:()=>{starts++}});
 const old=w.requestStart();w.cancelPreparation();load();await old;assert.equal(starts,0);assert.equal(compiles,0);
 w.modelPending=Promise.resolve();await w.requestStart();assert.equal(starts,1);assert.equal(compiles,2);await w.prepareRace();assert.equal(compiles,2);
});
test('live rival snapshots are bounded, extrapolation is limited and stale rivals disappear',async()=>{
 const {LiveRivals}=await import(await moduleUrl(resolve('components/rally/live-rivals.ts')));const original=globalThis.performance;let now=1000;globalThis.performance={now:()=>now};
 try{const model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));const rivals=new LiveRivals();rivals.prewarm(model);assert.equal(rivals.group.children.length,3);
 for(let i=0;i<20;i++){now=1000+i*100;rivals.receive({id:'a',x:0,z:i,heading:0,speed:10,progress:0,sent:now},model);}
 assert.equal(rivals.group.children.length,3);assert.equal(rivals.cars.get('a').samples.length,8);rivals.update(now+500,()=>0);assert.ok(rivals.cars.get('a').car.position.z<=20);rivals.update(now+2100,()=>0);assert.equal(rivals.cars.get('a').car.visible,false);rivals.clear();assert.equal(rivals.group.children.length,0);
 }finally{globalThis.performance=original;}
});

test('audio failures never change the explicit mute preference and the next gesture retries',async()=>{
 const oldDocument=globalThis.document;globalThis.document={hidden:false};memory.clear();const w=fixture();let attempts=0,notices=0,fail=true,paused=0;
 Object.assign(w,{mode:'garage',muted:false,audio:{enable:async()=>{attempts++;if(fail)throw new DOMException('Gesture required','NotAllowedError');},pause(){paused++;}},callbacks:{audioError(){notices++;}}});
 try{
  await w.ensureAudio();assert.equal(attempts,0,"preparation must not request playback before interaction");
  for(let i=0;i<3;i++){w.unlockAudio();await new Promise(r=>setImmediate(r));assert.equal(w.muted,false);assert.equal(memory.has('rally-muted'),false);}
  assert.equal(notices,3);fail=false;w.unlockAudio();await new Promise(r=>setImmediate(r));assert.equal(attempts,4);assert.equal(w.muted,false);
  await w.sound(true);w.unlockAudio();await new Promise(r=>setImmediate(r));assert.equal(attempts,4);assert.equal(w.muted,true);assert.equal(memory.get('rally-muted'),'true');
  fail=true;await assert.rejects(w.sound(false));assert.equal(w.muted,false);assert.equal(memory.get('rally-muted'),'false');assert.ok(paused>=1);
  w.disposed=true;w.audioFailed();assert.equal(notices,3);
 }finally{globalThis.document=oldDocument;}
});

test('member-specific rival preparation is bounded and empty prewarmed ghosts update safely',async()=>{
 const {LiveRivals}=await import(await moduleUrl(resolve('components/rally/live-rivals.ts')));
 const fetchBefore=globalThis.fetch;globalThis.fetch=async()=>{throw Error('optional model offline');};
 const model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));
 const rivals=new LiveRivals();try{
  await rivals.prewarmDrivers([{id:'a',car:0,color:'#ff0000'},{id:'b',car:1,color:'#00ff00'},{id:'c',car:2,color:'#0000ff'},{id:'d',car:3,color:'#ffffff'}],model);
  assert.equal(rivals.group.children.length,3);rivals.update(performance.now(),()=>0);
  assert.ok(rivals.group.children.every(c=>!c.visible));
  const prepared=rivals.cars.get('b').car;rivals.receive({id:'b',x:1,z:2,heading:0,speed:0,progress:0,sent:Date.now()},model);
  assert.equal(rivals.cars.get('b').car,prepared);assert.equal(prepared.scale.x,1);rivals.update(performance.now(),()=>0);assert.equal(prepared.visible,true);
 }finally{rivals.clear();globalThis.fetch=fetchBefore;}
 assert.equal(rivals.group.children.length,0);
});

test('hover pods tilt with steering, preserve authored cant, freeze and reset',async()=>{
 const {VehicleVisual}=await import(await moduleUrl(resolve('components/rally/vehicle-visual.ts')));
 const group=new T.Group();for(const end of ['front','rear'])for(const side of ['left','right']){const pod=new T.Group();pod.name=`hover_pod_${end}_${side}`;pod.rotation.z=side==='left'?.2:-.2;group.add(pod);}
 const bases=group.children.map(p=>p.quaternion.clone()),visual=new VehicleVisual(group).bind();
 for(const steer of [-1,1]){visual.resetPods();for(let i=0;i<30;i++)visual.update(1/60,5,steer,false,true);group.children.forEach((pod,i)=>{const delta=pod.quaternion.clone().multiply(bases[i].clone().invert());const up=new T.Vector3(0,1,0).applyQuaternion(delta),forward=new T.Vector3(0,0,1).applyQuaternion(delta);assert.ok(up.x*steer<0);assert.ok(forward.x*steer<0);assert.ok(delta.angleTo(new T.Quaternion())<.18);});}
 const held=group.children[0].quaternion.clone();visual.update(0,0,-1,false,false);assert.ok(held.angleTo(group.children[0].quaternion)<1e-7);
 visual.resetPods();group.children.forEach((p,i)=>assert.ok(p.quaternion.angleTo(bases[i])<1e-7));visual.update(.016,0,-1,false,false,true);const direct=group.children[0].quaternion.clone();visual.update(.016,0,-1,false,false,true);assert.ok(direct.angleTo(group.children[0].quaternion)<1e-7);
});
