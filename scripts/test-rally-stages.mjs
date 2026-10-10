import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const uri=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const stageCode=compile(await readFile(new URL('../components/rally/stages.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const stageUri=uri(stageCode);
const {stages,stagePoints,boardKey,validSelection,surfaceGrip}=await import(stageUri);
const validation=compile(await readFile(new URL('../lib/rally/validation.ts',import.meta.url),'utf8')).replace("'../../components/rally/stages'",JSON.stringify(stageUri));
const {validateRun,validName}=await import(uri(validation));
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
