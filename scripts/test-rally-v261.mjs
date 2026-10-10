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
const {paceNotes,PaceScheduler}=await import(await moduleUrl(resolve('components/rally/codriver.ts')));
const {hapticCapability}=await import(await moduleUrl(resolve('components/rally/controls.ts')));
const {stagePoints}=await import(await moduleUrl(resolve('components/rally/stages.ts')));
test('all 24 rally directions have ordered, available calls and correct turn sides',async()=>{
 for(const stage of ['forest','mountain','alpine','desert'])for(const track of [1,2,3])for(const reverse of [false,true]){
  const selection={stage,track,reverse,weather:'clear'},notes=paceNotes(selection),points=stagePoints(selection);
  assert.ok(notes.length>=9);assert.equal(notes.at(-1).text,'To finish');
  for(let i=0;i<notes.length;i++){
   const n=notes[i];if(i)assert.ok(n.distance>=notes[i-1].distance);
   assert.ok((await readFile(`public/rally/voice-${n.clips[0]}.wav`)).length>1000);
   if(n.clips[0].includes('-')){const a=points[n.index-14],b=points[n.index],c=points[n.index+14];const turn=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);assert.equal(n.clips[0].endsWith('right'),turn>0);}
  }
 }
 assert.deepEqual(paceNotes({stage:'kart',weather:'clear',reverse:false}),[]);
});
test('scheduler combines, deduplicates, rejects shortcuts and resynchronises recovery',()=>{
 const notes=[20,28,80].map((distance,i)=>({index:i,distance,clips:['1-left'],text:'Left 1'}));
 const s=new PaceScheduler(notes);assert.equal(s.update(0,0,0),null);
 const call=s.update(1,10,1);assert.equal(call.clips.length,2);assert.match(call.text,/into/);
 assert.equal(s.update(2,10,2),null);assert.equal(s.update(90,10,3),null);
 s.resync(75);assert.equal(s.update(76,10,8).distance,80);assert.equal(s.update(77,10,12),null);
 s.resync(0);assert.equal(s.update(1,10,15),null,'recovery never repeats already spoken notes');
});
test('haptic capability distinguishes controller, device and unsupported',()=>{
 assert.equal(hapticCapability([],false),'unavailable');assert.equal(hapticCapability([],true),'device');assert.equal(hapticCapability([{vibrationActuator:{playEffect(){}}}],false),'controller');
});
