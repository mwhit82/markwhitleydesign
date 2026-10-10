import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
import * as T from 'three';
async function load(path){
 let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from ["']([^"']+)["']/g)]){const spec=match[1];code=code.replace(match[0],`from '${spec.startsWith('.')?await load(resolve(dirname(path),spec+'.ts')):import.meta.resolve(spec)}'`);}
 return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
const {lighting,WeatherParticles}=await import(await load(resolve('components/rally/conditions.ts')));
const {CheckpointEffects}=await import(await load(resolve('components/rally/checkpoint-effects.ts')));
const {stages,timesOfDay}=await import(await load(resolve('components/rally/stages.ts')));
const paint={fillRect(){},fillText(){},createRadialGradient(){return {addColorStop(){}};}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>paint})};
test('96 lighting configurations keep a readable ambient floor and bounded headlights',()=>{
 let count=0;for(const stage of stages)for(const weather of stage.conditions)for(const reverse of [true,false])for(const timeOfDay of timesOfDay){
  const p=lighting({stage:stage.id,weather,reverse,timeOfDay});assert.ok(p.ambient>=.5);assert.ok(p.near<p.far);assert.ok(p.lamps<=65);assert.equal(p.lamps===0,timeOfDay==='midday');count++;
 }assert.equal(count,96);
});
test('weather buffers are reused, bounded, camera-centred and pause cleanly',()=>{
 for(const [type,count] of [['rain',400],['snow',180]]){
  const w=new WeatherParticles(type,false),buffer=w.object.geometry.attributes.position.array;
  assert.equal(w.count,count);for(let i=0;i<100;i++)w.update(.016,new T.Vector3(60,0,60));
  assert.equal(w.object.geometry.attributes.position.array,buffer);assert.ok([...buffer].every(Number.isFinite));
  const before=[...buffer];w.update(0,new T.Vector3(60,0,60));assert.deepEqual([...buffer],before);
  assert.equal(new WeatherParticles(type,true).count,count/2);
 }
});
test('checkpoint flags persist, bursts deduplicate and cap at 96; reset restores flags',()=>{
 const effect=new CheckpointEffects(false),meshes=[];
 for(let i=0;i<18;i++)for(let side=0;side<2;side++){const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());effect.register(i,mesh);meshes.push(mesh);}
 const original=meshes[0].material;
 effect.emit([{checkpoint:1,outcome:'accepted',time:1}]);assert.notEqual(meshes[0].material,original);assert.equal(effect.cursor,48);
 effect.emit([{checkpoint:1,outcome:'accepted',time:1}]);assert.equal(effect.cursor,48);
 effect.emit([{checkpoint:2,outcome:'missed',time:2}]);assert.equal(effect.cursor,48);
 effect.emit([{checkpoint:3,outcome:'accepted',time:3},{checkpoint:4,outcome:'accepted',time:3}]);assert.equal(effect.life.filter(n=>n>0).length,96);
 effect.update(0);assert.equal(effect.life[0],1.25);effect.update(2);assert.equal(effect.particles.visible,false);
 effect.reset();assert.equal(meshes[0].material,original);assert.equal(effect.states.size,0);
 const reduced=new CheckpointEffects(true);reduced.emit([{checkpoint:1,outcome:'accepted',time:1}]);assert.equal(reduced.cursor,0);
});
const {SurfaceEffects,TRACK_CAP,SPLASH_CAP,createMud}=await import(await load(resolve('components/rally/surface-effects.ts')));
const {stagePoints}=await import(await load(resolve('components/rally/stages.ts')));
test('rain-only puddles follow each route; mud, tracks and splash pools are bounded and pause/reset',()=>{
 for(const stage of stages)for(const reverse of [true,false]){
  const selection={stage:stage.id,weather:'rain',reverse},points=stagePoints(selection),effect=new SurfaceEffects(selection,points,false);
  assert.equal(effect.puddles.length,5);assert.equal(new SurfaceEffects({...selection,weather:'clear'},points,false).puddles.length,0);
  assert.ok(effect.puddles.every(p=>points.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<2.2)));
  for(let i=0;i<1800;i++)effect.update(.016,new T.Vector3(i*.05,0,0),0,12,true);
  assert.equal(effect.tracks.count,TRACK_CAP);assert.equal(effect.splashes.count,SPLASH_CAP);assert.ok(effect.mud>0&&effect.mud<=1);assert.ok([...effect.tracks.instanceMatrix.array].every(Number.isFinite));
  const before=[...effect.age],mud=effect.mud;effect.update(0,new T.Vector3(),0,12,true);assert.deepEqual([...effect.age],before);assert.equal(effect.mud,mud);
  const p=effect.puddles[0];for(let i=0;i<50;i++)effect.update(.02,new T.Vector3(p.x,0,p.z),0,12,true);assert.ok(effect.life.some(n=>n>0));
  effect.update(21,new T.Vector3(p.x,0,p.z),0,0,false);assert.ok([...effect.alpha.array].every(n=>n===0));
  effect.reset();assert.equal(effect.mud,0);assert.ok(effect.life.every(n=>n===0));
 }
 assert.equal(createMud('#765432').count,64);
});
test('dense fog obscures far road while retaining immediate camera target at every time of day',()=>{
 for(const timeOfDay of timesOfDay){const fog=lighting({stage:'forest',weather:'fog',reverse:false,timeOfDay});assert.ok(fog.near<=54&&fog.near>=40);assert.ok(fog.far<80);}
});
