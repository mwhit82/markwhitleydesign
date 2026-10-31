import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {moduleUrl} from './rally-test-loader.mjs';
const {ChristmasAudio}=await import(await moduleUrl(resolve('components/hallowseve26/audio.ts')));
const settle=()=>new Promise(r=>setImmediate(r));
test('audio requires a gesture, crossfades, caps voices, mutes and disposes safely',async()=>{
 const sources=[],gains=[];let contexts=0,fetches=0;
 class Parameter {value=0;ramps=[];setTargetAtTime(v){this.value=v;}cancelAndHoldAtTime(){}linearRampToValueAtTime(v,time){this.ramps.push([v,time]);}}
 class Context {state='suspended';currentTime=10;destination={};constructor(){contexts++;}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}createStereoPanner(){return {pan:new Parameter(),connect(){},disconnect(){}};}createGain(){const n={gain:new Parameter(),connect(){},disconnect(){}};gains.push(n);return n;}createBufferSource(){const n={playbackRate:{value:1},connect(){},disconnect(){},start(){n.started=true;}};sources.push(n);return n;}async decodeAudioData(){return {};}}
 const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch;globalThis.AudioContext=Context;globalThis.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
 try{const audio=new ChristmasAudio();await audio.cue('click');assert.equal(contexts,0);assert.equal(fetches,0);audio.settings(false,.5,.6);await audio.start();await settle();assert.equal(sources.filter(s=>s.loop).length,3);audio.setScene(true,false);assert.ok(gains.some(g=>g.gain.ramps.some(([v,t])=>v===1&&t===13)));audio.settings(true,.5,.6);const before=sources.length;await audio.cue('place');assert.equal(sources.length,before);audio.settings(false,.5,.6);await Promise.all(Array.from({length:25},()=>audio.cue('click')));assert.equal(sources.length,before+1);audio.suspend();await audio.cue('place');assert.equal(sources.length,before+1);audio.resume();await audio.cue('place');assert.equal(sources.length,before+2);audio.close();await audio.start();assert.equal(contexts,1);}finally{globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch;}
});
test('failed asset downloads do not reject gameplay calls',async()=>{const old=globalThis.AudioContext;globalThis.AudioContext=class {constructor(){throw Error('Unavailable')}};try{const audio=new ChristmasAudio();await assert.doesNotReject(()=>audio.start());await assert.doesNotReject(()=>audio.cue('click'));assert.match(audio.status,/unavailable/i);}finally{globalThis.AudioContext=old;}});
