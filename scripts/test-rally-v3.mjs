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
const S=await import(await moduleUrl(resolve('components/rally/stages.ts')));
const {validateRun}=await import(await moduleUrl(resolve('lib/rally/validation.ts')));
const {Atmosphere}=await import(await moduleUrl(resolve('components/rally/atmosphere.ts')));
const {DriverCamera}=await import(await moduleUrl(resolve('components/rally/driver-camera.ts')));
const {readControls}=await import(await moduleUrl(resolve('components/rally/controls.ts')));
const T=await import('three');
test('all 360 NYC/outdoor-kart race configurations validate and preserve clear-midday keys',()=>{
 const keys=new Set();let count=0;
 for(const stage of ['kart','nyc'])for(const track of stage==='nyc'?[1]:[1,2,3])for(const reverse of [false,true])for(const weather of S.stages.find(s=>s.id===stage).conditions)for(const timeOfDay of S.timesOfDay)for(const laps of [1,3,5]){
  const s={stage,track,reverse,weather,timeOfDay,laps,circuitVersion:2};assert.ok(S.validSelection(s));const key=S.boardKey(s);assert.ok(!keys.has(key));keys.add(key);count++;
  const p=S.stagePoints(s);assert.ok(p[0].distanceTo(p[650])<1e-8);assert.ok(p.every(q=>Math.abs(q.x)<79&&Math.abs(q.z)<74));
  let time=0,previous=p[0];const trace=[[0,previous.x,previous.z]];
  for(let lap=0;lap<laps;lap++)for(const q of p.slice(1)){time+=q.distanceTo(previous)/12;previous=q;if(time-trace.at(-1)[0]>.25)trace.push([time,q.x,q.z]);}
  time+=p[1].distanceTo(previous)/12;trace.push([time,p[1].x,p[1].z]);
  assert.ok(validateRun(s,time,trace,time+3),JSON.stringify(s));
  if(stage==='kart'&&weather==='clear'&&timeOfDay==='midday')assert.equal(key,`v3:kart:track${track}:${reverse?'reverse':'forward'}:laps${laps}`);
 }
 assert.equal(count,360);
 assert.equal(S.validSelection({stage:'nyc',track:2,weather:'clear',reverse:false,circuitVersion:2}),false);
});
test('NYC station and arrival clear the circuit in both directions',()=>{
 for(const reverse of [false,true]){const s={stage:'nyc',weather:'clear',reverse,circuitVersion:2},p=S.stagePoints(s),a=new Atmosphere(p,s);assert.ok(a.layout.center.distanceTo(p[0])>20);assert.ok(p.every(q=>q.distanceTo(a.layout.center)>15));assert.ok(a.group.children.every(o=>Number.isFinite(o.position.x)));a.celebrate();a.reset();}
});
test('driver camera blends, stabilises its horizon and restores external visibility',()=>{
 const c=new DriverCamera(),v=new T.Group(),base=new T.OrthographicCamera();base.position.set(28,36,28);base.lookAt(0,0,0);c.enabled=true;
 for(let i=0;i<40;i++)c.update(.016,v,1,.5,base,true,false,390,844,true);
 assert.equal(c.blend,1);assert.equal(v.visible,true);assert.ok(c.camera.aspect<1);assert.ok(Math.abs(c.camera.up.y-1)<1e-8);
 c.update(0,v,1,0,base,false,true,844,390,true);assert.equal(c.blend,0);assert.equal(v.visible,true);c.dispose();
 assert.equal(readControls({steering:'wheel',sensitivity:1.2,haptics:true}).steering,'arrows');
});
const {roomAction,sweepRoom}=await import(await moduleUrl(resolve('lib/rally/room-state.ts')));
const roomFixture=()=>({version:1,code:'ABC234',host:'a',selection:{stage:'forest',weather:'clear',reverse:false},car:0,phase:'lobby',attempt:0,startAt:0,members:['a','b','c','d'].map(id=>({id,name:id,ready:false,seen:1000,status:'lobby'}))});
test('four seats ready together, host alone controls locked setup and countdown',()=>{
 const r=roomFixture();assert.throws(()=>roomAction(r,'a',{type:'start'},1000));assert.throws(()=>roomAction(r,'b',{type:'setup',selection:r.selection,car:1},1000));
 for(const m of r.members)roomAction(r,m.id,{type:'ready',ready:true},1000);
 roomAction(r,'a',{type:'start'},1000);assert.equal(r.startAt,5000);assert.equal(r.attempt,1);assert.ok(r.members.every(m=>m.status==='racing'));
 assert.throws(()=>roomAction(r,'a',{type:'setup',selection:r.selection,car:1},1000));
});
test('reconnect grace, host migration, terminal states and rematch',()=>{
 const r=roomFixture();for(const m of r.members)m.ready=true;roomAction(r,'a',{type:'start'},1000);
 r.members.slice(1).forEach(m=>m.seen=21000);sweepRoom(r,21000);assert.equal(r.host,'a');sweepRoom(r,21001);assert.equal(r.host,'b');assert.equal(r.members[0].status,'disconnected');
 assert.throws(()=>roomAction(r,'a',{type:'ready',ready:true},21002));
 for(const id of ['b','c','d'])roomAction(r,id,{type:'finish',attempt:1,time:12,trace:[]},21002);
 assert.equal(r.phase,'results');assert.ok(r.members.slice(1).every(m=>m.practice));assert.throws(()=>roomAction(r,'b',{type:'finish',attempt:1,time:12},21002));
 roomAction(r,'b',{type:'again'},21003);assert.equal(r.members.length,3);assert.ok(r.members.every(m=>m.status==='lobby'&&!m.ready));
 roomAction(r,'b',{type:'leave'},21004);assert.equal(r.host,'c');
});
test('forged early finishes and wrong attempt rejected, malformed traces remain practice',()=>{
 const r=roomFixture();for(const m of r.members)m.ready=true;roomAction(r,'a',{type:'start'},1000);
 assert.throws(()=>roomAction(r,'a',{type:'finish',attempt:1,time:100,trace:[]},6000));assert.throws(()=>roomAction(r,'a',{type:'finish',attempt:0,time:1},6000));
 roomAction(r,'a',{type:'finish',attempt:1,time:1,trace:[[NaN,0,0]]},6000);assert.equal(r.members[0].practice,true);
});
const {paceNotes}=await import(await moduleUrl(resolve('components/rally/codriver.ts')));
test('NYC pace calls match the route turn direction on both laps',()=>{
 for(const reverse of [false,true]){const s={stage:'nyc',weather:'clear',reverse,circuitVersion:2},points=S.stagePoints(s);for(const n of paceNotes(s)){const a=points[n.index-14],b=points[n.index],c=points[n.index+14],turn=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);assert.equal(n.clips[0].endsWith('right'),turn>0,`${reverse}:${n.index}:${n.text}`);}}
});
const {environmentScenery}=await import(await moduleUrl(resolve('components/rally/v3-scenery.ts')));
test('static scenery uses bounded spatial batches with shared geometry',()=>{
 for(const stage of ['kart','nyc']){const s={stage,weather:'clear',reverse:false,circuitVersion:2},g=environmentScenery(s,S.stagePoints(s),()=>false);assert.ok(g.children.length<120);assert.ok(new Set(g.children.map(o=>o.geometry)).size<40);assert.ok(g.children.every(o=>o.isInstancedMesh));console.log(stage,'static batches',g.children.length);}
});

test('cockpit hides the body while keeping night headlights active',()=>{
 const c=new DriverCamera(),v=new T.Group(),body=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()),lamp=new T.SpotLight(),base=new T.PerspectiveCamera();v.add(body,lamp);c.enabled=true;c.update(1,v,0,0,base,true,true,390,844,false);assert.equal(body.visible,false);assert.equal(lamp.visible,true);assert.equal(v.visible,true);c.update(1,v,0,0,base,false,true,390,844,false);assert.equal(body.visible,true);c.dispose();
});

test('cockpit wheel and instruments animate without frame allocations or excess geometry',()=>{
 const c=new DriverCamera(),v=new T.Group(),base=new T.PerspectiveCamera();c.enabled=true;
 c.update(.5,v,0,1,base,true,true,390,700,false,110,4000,false,true);
 assert.ok(c.wheel.rotation.z<-.8);const angle=c.wheel.rotation.z;
 c.update(0,v,0,-1,base,true,true,390,700,false,110,4000,false,true);assert.equal(c.wheel.rotation.z,angle);
 c.update(.5,v,0,-1,base,true,true,390,700,false,0,950,false,false);assert.ok(c.wheel.rotation.z>.8);
 let triangles=0,meshes=0;c.cockpit.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 assert.ok(triangles<5000,`${triangles} triangles`);assert.ok(meshes<=24,`${meshes} meshes`);c.dispose();
});

test('every route has compact, distinct weather and daylight preview assets',async()=>{
 const {stat}=await import('node:fs/promises');
 for(const stage of S.stages.filter(s=>!['neon','mx'].includes(s.id)))for(const track of stage.id==='nyc'?[1]:[1,2,3]){
  const hashes=new Set();for(const variant of [...stage.conditions.map(w=>`weather-${w}`),...S.timesOfDay.map(t=>`time-${t}`)]){
   const path=resolve(`public/rally/previews/v42/${stage.id}-${track}-${variant}.webp`);assert.ok((await stat(path)).size<180000);
   if(variant.startsWith('weather'))hashes.add((await readFile(path)).toString('base64'));
  }assert.equal(hashes.size,stage.conditions.length);
 }
});

test('Blender cockpit switches safely, lights gauges at night and falls back on failure',async()=>{
 const fetchBefore=globalThis.fetch;globalThis.fetch=async path=>{const b=await readFile(resolve('public'+path));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 const c=new DriverCamera(),v=new T.Group(),base=new T.PerspectiveCamera();c.enabled=true;
 try{const goodFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};const failed=new DriverCamera();await failed.prepare(false);assert.equal(failed.assetRoot,null);assert.ok(failed.cockpit.children.length>3);failed.dispose();globalThis.fetch=goodFetch;await c.prepare(false);assert.ok(c.assetRoot);const root=c.assetRoot;await c.prepare(false);assert.equal(c.assetRoot,root);c.update(.5,v,0,-1,base,true,true,390,700,false,40,3000,false,true);assert.ok(c.wheel.rotation.z>.8,'left is counterclockwise from the driver');assert.equal(c.arms.length,2);assert.ok(c.lights.every(m=>m.emissiveIntensity>1));assert.ok(c.arms.every(a=>Number.isFinite(a.scale.y)&&a.scale.y>.1));await c.prepare(true);assert.notEqual(c.assetRoot,root);globalThis.fetch=async()=>{throw Error('offline')};const fallback=new DriverCamera();await fallback.prepare(false);assert.ok(fallback.assetRoot,'encoded buffers survive offline restarts');fallback.dispose();}finally{c.dispose();globalThis.fetch=fetchBefore;}
});
test('track outline cards cover every layout and direction, with open rally routes',async()=>{for(const stage of S.stages.filter(s=>!['neon','mx'].includes(s.id)))for(const track of stage.id==='nyc'?[1]:[1,2,3]){const pair=[];for(const direction of ['forward','reverse']){const svg=await readFile(`public/rally/previews/routes/${stage.id}-${track}-${direction}.svg`,'utf8');assert.ok(svg.includes('<polyline'));assert.ok(svg.includes(direction.toUpperCase()));assert.ok(svg.includes(['kart','nyc'].includes(stage.id)?'START / FINISH':'POINT TO POINT'));pair.push(svg);}assert.notEqual(...pair);}});
