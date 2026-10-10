import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../components/rally/handling.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
const {handling, engine} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('coasting keeps momentum; corners allow modest slip and recover grip', () => {
  const straight = handling(20,0,7.2,false,false);
  assert.ok(Math.exp(-straight.drag * 2) > .75);
  const corner = handling(20,1,7.2,false,false);
  assert.ok(corner.grip < straight.grip && corner.grip > 5);
  assert.ok(handling(20,1,7.2,true,false).grip < corner.grip);
  assert.ok(handling(20,0,7.2,false,true).drag > straight.drag);
});
test('limiter cuts and restores power; lift-off drops revs', () => {
  let speed=0, rpm=950, limited=false, cuts=0, releases=0;
  for(let i=0;i<1800;i++) {
    const next=engine(speed,1,rpm,limited,1/60);
    if(next.limited && !limited) cuts++;
    if(!next.limited && limited) releases++;
    ({rpm,limited}=next);
    speed=Math.min(25,(speed+(limited?0:15/60))*Math.exp(-.12/60));
    assert.ok(rpm <= 7400);
  }
  assert.ok(cuts>1 && releases>1);
  const lift=engine(speed,0,rpm,true,.5);
  assert.ok(lift.rpm < rpm && !lift.limited);
});
