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
