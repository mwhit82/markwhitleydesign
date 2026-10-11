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
const {kartFinishLayout,kartFloor,kartLapProgress,kartBarrierSegments,kartFlagPosition}=await import(await moduleUrl(resolve('components/rally/kart-venue.ts')));
const {stagePoints,checkpointIndices}=await import(await moduleUrl(resolve('components/rally/stages.ts')));
const {Atmosphere}=await import(await moduleUrl(resolve('components/rally/atmosphere.ts')));
const T=await import('three');
test('six kart underpasses leave the racing surface intact, open real ramps and reach the service bay',()=>{
 for(const track of [1,2,3])for(const reverse of [false,true]){
  const selection={stage:'kart',weather:'clear',circuitVersion:2,track,reverse};const points=stagePoints(selection),layout=kartFinishLayout(points,selection),floor=kartFloor(layout);floor.updateMatrixWorld(true);
  assert.ok(layout.approach.getPointAt(0).distanceTo(points[650])<.001);assert.ok(layout.approach.getPointAt(1).distanceTo(layout.center)<.001);
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
  for(const p of points){ray.ray.origin.set(p.x,20,p.z);assert.ok(ray.intersectObject(floor,true)[0].point.y>=-.301,`floor cut into racing corridor ${track}/${reverse}`);}
  for(const side of [-1,1]){const p=layout.crossing.clone().addScaledVector(layout.normal,side*13);ray.ray.origin.set(p.x,20,p.z);assert.ok(ray.intersectObject(floor,true)[0].point.y< -4,'entry/exit must be an actual opening');}
  const samples=layout.approach.getSpacedPoints(400);assert.ok(samples.some(p=>p.y<-3.99&&p.distanceTo(layout.crossing.clone().setY(-4))<1));
  assert.ok(samples.every(p=>Number.isFinite(p.y)&&p.y>=-4.01&&p.y<=.01));
  const a=new Atmosphere(points,selection);assert.ok(a.layout.center.distanceTo(layout.center)<.001);a.update(.1,1,points[0],20,true);a.celebrate();a.reset();
 }
});
test('lap display is continuous within accepted checkpoint bounds and resets independently of lap counting',()=>{
 assert.equal(kartLapProgress(0,0,checkpointIndices),0);assert.equal(kartLapProgress(10.5,0,checkpointIndices),10.5/650);
 assert.equal(kartLapProgress(500,0,checkpointIndices),checkpointIndices[0]/650);assert.equal(kartLapProgress(650,18,checkpointIndices),1);
 assert.equal(kartLapProgress(-10,0,checkpointIndices),0);assert.ok(kartLapProgress(0,3,checkpointIndices)>0);
});

test('continuous barrier contours stay outside every circuit driving corridor',()=>{
 for(const track of [1,2,3])for(const reverse of [false,true]){
  const points=stagePoints({stage:'kart',weather:'clear',circuitVersion:2,track,reverse}),segments=kartBarrierSegments(points,()=>false);
  assert.ok(segments.length>400&&segments.length<2000);
  for(const segment of segments){assert.ok(Number.isFinite(segment.angle)&&segment.length>0);assert.ok(Math.min(...points.map(p=>p.distanceTo(segment.p)))>6.35);}
 }
});

test('kart checkpoint signs stay outside every road corridor on all six routes',()=>{
 for(const track of [1,2,3])for(const reverse of [false,true]){
 const points=stagePoints({stage:'kart',weather:'clear',circuitVersion:2,track,reverse});
 const edges=kartBarrierSegments(points,()=>false);
 for(const idx of checkpointIndices){const p=points[idx],a=points[idx-1],dir=new T.Vector3(p.z-a.z,0,a.x-p.x).normalize();
 for(const side of [-1,1]){const flag=kartFlagPosition(edges,p,dir,side,points);assert.ok(Math.min(...points.map(q=>q.distanceTo(flag)))>7,`flag intrudes ${track}/${reverse}/${idx}`);}
 }
 }
});
