import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const uri=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const cache=new Map();
const commands=[];
let fixture={};
globalThis.__weeklyRedis=async(...command)=>{commands.push(command);return fixture[command[0]]??null;};
const store=uri(`export const configured=()=>true;export const player=async()=> 'driver';export const redis=(...args)=>globalThis.__weeklyRedis(...args);export const rateLimit=async()=>true;export const sameOrigin=()=>true;`);
async function moduleUrl(path){
 if(path.endsWith('/lib/rally/store.ts'))return store;
 if(cache.has(path))return cache.get(path);
 let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from ["']([^"']+)["']/g)]){
  const spec=match[1],url=spec.startsWith('.')?await moduleUrl(resolve(dirname(path),spec+'.ts')):import.meta.resolve(spec);
  code=code.replace(match[0],`from '${url}'`);
 }
 const url=uri(code);cache.set(path,url);return url;
}
const {boardWindow,readBoardWindow,periodBoardKey}=await import(await moduleUrl(resolve('lib/rally/period.ts')));
const leaderboard=await import(await moduleUrl(resolve('app/api/rally/leaderboard/route.ts')));
const standings=await import(await moduleUrl(resolve('app/api/rally/standings/route.ts')));
const selection='stage=forest&weather=clear&reverse=false';
const request=query=>new Request(`http://localhost/api/rally/leaderboard?${selection}&${query}`);
test('UK Monday boundary in winter, summer and at both clock changes',()=>{
 for(const [now,week,resetsAt] of [
  ['2026-01-04T23:59:59Z','2025-12-29','2026-01-05T00:00:00.000Z'],
  ['2026-01-05T00:00:00Z','2026-01-05','2026-01-12T00:00:00.000Z'],
  ['2026-10-11T22:59:59Z','2026-10-05','2026-10-11T23:00:00.000Z'],
  ['2026-10-11T23:00:00Z','2026-10-12','2026-10-18T23:00:00.000Z'],
  ['2026-03-23T00:00:00Z','2026-03-23','2026-03-29T23:00:00.000Z'],
  ['2026-03-29T23:00:00Z','2026-03-30','2026-04-05T23:00:00.000Z'],
  ['2026-10-19T00:00:00Z','2026-10-19','2026-10-26T00:00:00.000Z'],
  ['2026-10-26T00:00:00Z','2026-10-26','2026-11-02T00:00:00.000Z'],
 ])assert.deepEqual(boardWindow('weekly',new Date(now)),{period:'weekly',week,resetsAt});
});
test('weekly is default, all-time keys remain identical, invalid periods rejected',()=>{
 assert.equal(readBoardWindow(new URLSearchParams()).period,'weekly');
 assert.equal(readBoardWindow(new URLSearchParams('period=monthly')),null);
 const base='rally:v2:forest:clear:forward:car0';
 assert.equal(periodBoardKey(base,boardWindow('all-time')),base);
 assert.match(periodBoardKey(base,boardWindow()),/:car0:week:\d{4}-\d{2}-\d{2}$/);
});
test('stage board reads weekly ranks, metadata and own position from the same keys',async()=>{
 commands.length=0;fixture={ZRANGE:['driver','32000'],ZCARD:1,ZRANK:0,HMGET:['{"name":"Driver","car":0}'],HGET:'{"name":"Driver","car":0}',ZSCORE:'32000'};
 const response=await leaderboard.GET(request('car=0'));const data=await response.json();
 assert.equal(response.status,200);assert.equal(data.window.period,'weekly');assert.equal(data.entries[0].time,32);assert.equal(data.me.rank,1);
 assert(commands.every(c=>String(c[1]).includes(`:car0:week:${data.window.week}`)));
 commands.length=0;await leaderboard.GET(request('period=all-time'));
 assert(commands.every(c=>!String(c[1]).includes(':week:')));
});
test('all-board search applies period to every board while preserving filters and pagination',async()=>{
 commands.length=0;fixture={EVAL:['[]',25,20,'[]']};
 const response=await standings.GET(request('car=0&search=son'));const data=await response.json();
 assert.equal(response.status,200);assert.equal(data.cursor,'20');assert.equal(data.window.period,'weekly');
 const command=commands[0];assert(command.slice(3,3+command[2]).every(k=>k.endsWith(`:car0:week:${data.window.week}`)));
 assert.equal(command.at(-2),'son');
 commands.length=0;await standings.GET(request('period=all-time'));assert(commands[0].slice(3,3+commands[0][2]).every(k=>!k.includes(':week:')));
});
test('stale weekly pagination and invalid period are rejected before reading records',async()=>{
 commands.length=0;
 for(const route of [leaderboard,standings]){
  assert.equal((await route.GET(request('week=2000-01-03'))).status,409);
  assert.equal((await route.GET(request('period=monthly'))).status,400);
 }
 assert.equal(commands.length,0);
});
const {stagePoints}=await import(await moduleUrl(resolve('components/rally/stages.ts')));
test('verified submission writes all-time and run-start weekly boards in one atomic operation',async()=>{
 const choice={stage:'forest',weather:'clear',reverse:false};
 const points=stagePoints(choice);let time=0;
 const trace=points.map((p,i)=>{if(i)time+=p.distanceTo(points[i-1])/12;return [time,p.x,p.z];});
 const started=Date.parse('2026-10-11T22:59:00Z');
 fixture={GET:JSON.stringify({player:'driver',selection:choice,car:0,started}),EVAL:1};commands.length=0;
 const body={run:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',name:'Son',time,trace};
 const post=()=>new Request('http://localhost/api/rally/leaderboard',{method:'POST',body:JSON.stringify(body)});
 const response=await leaderboard.POST(post());assert.equal(response.status,200);
 assert.equal((await response.json()).week,'2026-10-05');
 const save=commands.find(c=>c[0]==='EVAL');assert.equal(save[2],5);
 assert.deepEqual(save.slice(4,8),['rally:v2:forest:clear:forward','rally:v2:forest:clear:forward:car0','rally:v2:forest:clear:forward:week:2026-10-05','rally:v2:forest:clear:forward:car0:week:2026-10-05']);
 fixture.EVAL=0;assert.equal((await leaderboard.POST(post())).status,409);
 body.trace=[];commands.length=0;assert.equal((await leaderboard.POST(post())).status,400);assert(!commands.some(c=>c[0]==='EVAL'));
});
