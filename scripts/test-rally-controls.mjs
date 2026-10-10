import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import ts from 'typescript';
const code=ts.transpileModule(await readFile(new URL('../components/rally/controls.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {readControls,defaultControls,wheelDelta,wheelInput,rumbleStrength,RallyHaptics}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('default steering stays arrows; stored settings validate and sensitivity clamps',()=>{assert.deepEqual(readControls(null),defaultControls);assert.deepEqual(readControls({steering:'broken',sensitivity:NaN,haptics:'on'}),defaultControls);assert.equal(readControls({sensitivity:100}).sensitivity,1.5);assert.equal(readControls({sensitivity:-1}).sensitivity,.5);});
test('wheel crosses angular wrap without snapping, respects sensitivity and both full locks',()=>{assert.ok(Math.abs(wheelDelta(Math.PI-.01,-Math.PI+.01)-.02)<.00001);assert.ok(wheelInput(.5,1.5)>wheelInput(.5,.5));assert.equal(wheelInput(8,1),1);assert.equal(wheelInput(-8,1),-1);assert.equal(wheelInput(0,1),0);});
test('rumble eases into corners, bounds pulse frequency, stops on pause, tolerates unsupported devices',async()=>{
 let calls=0,resets=0;const strengths=[];const pad={vibrationActuator:{playEffect(type,p){calls++;strengths.push(p.weakMagnitude);assert.equal(type,'dual-rumble');assert.ok(p.duration<=160);return Promise.resolve('complete');},reset(){resets++;return Promise.resolve();}}};
 const h=new RallyHaptics();for(let now=0;now<1000;now+=16)h.update(now,.016,true,true,20,0,pad,false);const straight=strengths.at(-1);
 for(let now=1000;now<2000;now+=16)h.update(now,.016,true,true,20,1,pad,false);
 assert.ok(strengths.at(-1)>straight);assert.ok(calls<15);h.update(2000,.016,true,false,20,1,pad,false);assert.equal(resets,1);
 h.update(2100,.016,false,true,20,1,pad,false);assert.equal(resets,1);
 assert.equal(rumbleStrength(0,1),0);assert.ok(rumbleStrength(25,1)<.4);
 const bad={vibrationActuator:{playEffect(){calls++;return Promise.reject(Error('unsupported'));}}};h.update(2200,.016,true,true,20,1,bad,false);await Promise.resolve();const before=calls;h.update(2500,.016,true,true,20,1,bad,false);assert.equal(calls,before);h.stop();
 h.update(0,.016,true,true,10,0,undefined,false);
});
