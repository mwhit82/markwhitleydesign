import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile = file => ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports = {};
vm.runInNewContext(compile('components/soccer98/engine.ts'),{exports});
const {newMatch,step,enqueueTurn,placeBall,COLS,ROWS} = exports;
let match={...newMatch(),status:'playing'};
const queue=[];
assert.equal(enqueueTurn(queue,match.direction,'up'),true);
assert.equal(enqueueTurn(queue,match.direction,'left'),true);
assert.equal(enqueueTurn(queue,match.direction,'down'),false);
match=step(match,queue.shift()); assert.equal(match.direction,'up');
match=step(match,queue.shift()); assert.equal(match.direction,'left');
assert.equal(enqueueTurn(queue,match.direction,'right'),false);
assert.equal(enqueueTurn(queue,match.direction,'left'),false);
match={...newMatch(),status:'playing'};
for(let i=0;i<6;i++) match=step(match,'right');
assert.equal(match.score,1); assert.equal(match.players.length,2);
assert.ok(!match.players.some(p=>p.x===match.ball.x&&p.y===match.ball.y));
assert.equal(step({...match,players:[{x:23,y:2}]},'right').status,'over');
assert.equal(step({...match,players:[{x:2,y:2},{x:3,y:2},{x:3,y:3}],direction:'up'},'right').status,'over');
assert.equal(step({...match,status:'paused'},'right').status,'paused');
const full=Array.from({length:COLS*ROWS},(_,i)=>({x:i%COLS,y:Math.floor(i/COLS)}));
assert.equal(placeBall(full),null);
let starts=0,stops=0,created=0,decoded=0,fetches=0;
class Context {
  state='running';sampleRate=22050;destination={};
  constructor(){created++;}
  createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  decodeAudioData(){decoded++;return Promise.resolve({});}
  createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
  resume(){this.state='running';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
}
const audioExports={};vm.runInNewContext(compile('components/soccer98/audio.ts'),{exports:audioExports,AudioContext:Context,AbortController,fetch:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});
const audio=new audioExports.SoccerAudio();audio.play('turn');assert.equal(starts,0);
audio.unlock();audio.unlock();assert.equal(created,1);
await new Promise(resolve=>setImmediate(resolve));assert.equal(fetches,2);assert.equal(decoded,2);
audio.play('turn');audio.play('cheer');assert.equal(starts,2);
audio.setMuted(true);assert.equal(stops,2);audio.play('turn');assert.equal(starts,2);
audio.setMuted(false);audio.play('cheer');assert.equal(starts,3);audio.dispose();assert.equal(stops,3);
const silentExports={};vm.runInNewContext(compile('components/soccer98/audio.ts'),{exports:silentExports,AbortController,fetch:async()=>{throw new Error("offline");}});
const silent=new silentExports.SoccerAudio();assert.doesNotThrow(()=>{silent.unlock();silent.play('turn');silent.dispose();});
console.log('Passed: two-corner buffering, queue limit, reversals, growth, collisions, spawning, pause, audio reuse, mute, cleanup and missing audio API.');
const flightExports={};
vm.runInNewContext(compile('components/soccer98/ball-flight.ts'),{exports:flightExports});
const {kickBall,sampleFlight}=flightExports;
const short=kickBall({x:3,y:4},{x:4,y:4});assert.ok(short.duration<150);
const long=kickBall({x:0,y:0},{x:23,y:17});assert.equal(long.duration,650);
const launch=sampleFlight(long);assert.equal(launch.x,0);assert.equal(launch.y,0);assert.equal(launch.height,0);
const middle=sampleFlight({...long,elapsed:325});assert.equal(middle.x,11.5);assert.equal(middle.y,8.5);assert.ok(middle.height>0);
const landing=sampleFlight({...long,elapsed:650});assert.equal(landing.x,23);assert.equal(landing.y,17);assert.equal(landing.height,0);
const top=sampleFlight({...kickBall({x:0,y:0},{x:23,y:0}),elapsed:325});assert.ok(32-top.height>=8);
const airborne={...newMatch(),status:'playing',ball:{x:9,y:9}};
assert.equal(step(airborne,'right',false).score,0);
assert.equal(step(airborne,'right',true).score,1);
console.log('Passed: flight endpoints, arc height, short-pass timing, top-edge visibility and airborne collection protection.');
const validationExports = {};
vm.runInNewContext(compile('lib/soccer98/validation.ts'),{exports:validationExports,require:()=>exports});
const {validateReplay,validName}=validationExports;
let ranked={...newMatch(),status:'playing'}, replay='';
const rng=exports.seededRandom(42);
while(ranked.status==='playing'){ranked=step(ranked,'right',true,rng);replay+='3';}
assert.equal(validateReplay(42,replay,replay.length*150),ranked.score);
assert.equal(validateReplay(42,replay,0),null);
assert.equal(validateReplay(42,replay+'3',100000),null);
assert.equal(validateReplay(42,'x',100000),null);
assert.equal(validateReplay(42,'3',100000),null);
assert.equal(validName('Mark 98'),true);assert.equal(validName('<script>'),false);assert.equal(validName('A'),false);
const rngA=exports.seededRandom(123),rngB=exports.seededRandom(123);
for(let i=0;i<100;i++)assert.equal(rngA(),rngB());
console.log('Passed: seeded replay, completed match validation, elapsed-time bound, invalid traces and public names.');
const periodExports={};vm.runInNewContext(compile('lib/rally/period.ts'),{exports:periodExports,Intl,Date});
assert.equal(periodExports.boardWindow('weekly',new Date('2026-10-18T22:59:59Z')).week,'2026-10-12');
assert.equal(periodExports.boardWindow('weekly',new Date('2026-10-18T23:00:00Z')).week,'2026-10-19');
assert.equal(periodExports.boardWindow('weekly',new Date('2026-10-25T23:00:00Z')).resetsAt,'2026-10-26T00:00:00.000Z');
const api={};let available=true,consumed=false;const writes=[];
const store={configured:()=>available,player:async()=> 'test-player',sameOrigin:r=>r.headers.get('origin')==='https://test.local',rateLimit:async()=>true,redis:async(...args)=>{
 if(args[0]==='GET')return consumed?null:JSON.stringify({player:'test-player',seed:42,started:Date.now()-100000});
 if(args[0]==='EVAL'){consumed=true;writes.push(args);return 1;}
 if(args[0]==='ZREVRANGE')return ['test-player','1'];
 if(args[0]==='ZREVRANK')return 0;
 if(args[0]==='ZCARD')return 1;
 if(args[0]==='HMGET')return ['Tester'];
 if(args[0]==='ZSCORE')return '1';
 throw new Error('Unexpected command '+args[0]);
}};
vm.runInNewContext(compile('app/api/soccer98/leaderboard/route.ts'),{exports:api,require:p=>p.includes('/store')?store:p.includes('/period')?periodExports:validationExports,Response,URL,Date});
const request=body=>new Request('https://test.local/api/soccer98/leaderboard',{method:'POST',headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(body)});
let response=await api.POST(request({run:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',name:'Tester',trace:replay}));assert.equal(response.status,200);
assert.equal(writes[0][4],'soccer98:board');assert.match(writes[0][5],/^soccer98:board:week:/);
response=await api.POST(request({run:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',name:'Tester',trace:replay}));assert.equal(response.status,409);
response=await api.GET(new Request('https://test.local/api/soccer98/leaderboard?period=all-time'));let table=await response.json();assert.equal(table.entries[0].mine,true);assert.equal(table.me.rank,1);
response=await api.GET(new Request('https://test.local/api/soccer98/leaderboard?period=invalid'));assert.equal(response.status,400);
available=false;response=await api.GET(new Request('https://test.local/api/soccer98/leaderboard'));assert.equal(response.status,503);
console.log('Passed: weekly rollover/DST, score submission, both board keys, duplicate rejection, own rank, invalid periods and service outage.');
