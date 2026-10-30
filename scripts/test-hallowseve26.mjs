import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleUrl } from './rally-test-loader.mjs';
import { resolve } from 'node:path';
const s = await import(await moduleUrl(resolve('components/hallowseve26/simulation.ts')));
const advance=(g,seconds)=>{for(let i=0;i<seconds*20;i++)s.tick(g,.05);};
const build=(g,kind,x,z)=>{assert.equal(s.place(g,kind,x,z),true,`${kind} at ${x},${z}: ${g.message}`);return g.buildings.at(-1);};

test('construction charges once, rejects overlaps and refunds half',()=>{
  const g=s.newGame(),before={...g.stock};const b=build(g,'wall',3,3);
  assert.equal(g.stock.stone,before.stone-12);assert.equal(s.place(g,'wall',3,3),false);assert.equal(g.stock.stone,before.stone-12);
  assert.equal(s.demolish(g,b.id),true);assert.equal(g.stock.stone,before.stone-6);assert.equal(s.demolish(g,g.buildings[0].id),false);
  assert.equal(s.place(g,'workshop',16,16),false);
});
test('elves construct, gather, repair and produce toys',()=>{
  const g=s.newGame();const b=build(g,'workshop',3,0);const before=g.stock.toys;advance(g,35);
  assert.equal(b.progress,1);assert.ok(g.stock.toys>before);assert.ok(g.stock.wood>100);
  b.hp-=150;advance(g,20);assert.equal(b.hp,b.maxHp);
});
test('factory expansion requires free 3×3 footprint and charges only on success',()=>{
  const g=s.newGame();g.stock={wood:1000,stone:1000,toys:1000};const b=build(g,'workshop',3,0);b.progress=1;
  const wall=build(g,'wall',5,2);const before={...g.stock};assert.equal(s.upgrade(g,b.id),false);assert.deepEqual(g.stock,before);
  s.demolish(g,wall.id);assert.equal(s.upgrade(g,b.id),true);assert.equal(s.sizeOf(b),3);assert.equal(b.progress,0);
});
test('Santa restores a shrine once, grows following, and walks around structures',()=>{
  const g=s.newGame();s.restoreShrine(g,1);advance(g,25);assert.equal(g.shrines[0].restored,true);assert.equal(g.elves.length,6);
  s.restoreShrine(g,1);advance(g,5);assert.equal(g.elves.length,6);
  build(g,'wall',4,3);const path=s.route(g,{x:3,z:3},{x:5,z:3});assert.ok(path.length>2);assert.ok(!path.some(p=>p.x===4&&p.z===3));
});
test('gates admit elves and Santa but block Halloween; sealed castles have breach routes',()=>{
  const g=s.newGame();g.stock={wood:10000,stone:10000,toys:10000};g.elves=[];g.santa.x=10;g.santa.z=10;
  for(let x=-2;x<=3;x++)for(let z=-2;z<=3;z++)if(x===-2||x===3||z===-2||z===3)build(g,x===-2&&z===0?'gate':'wall',x,z);
  assert.ok(s.route(g,{x:-5,z:0},{x:-1,z:0}).length);
  assert.equal(s.route(g,{x:-5,z:0},{x:-1,z:0},0,true).length,0);
  assert.ok(s.route(g,{x:-5,z:0},{x:-1,z:0},0,true,true).length);
  s.startNight(g);advance(g,100);assert.ok(g.buildings.some(b=>b.hp<b.maxHp)||g.buildings.length<21);
});
test('night prohibits building and cheer has a cooldown',()=>{
  const g=s.newGame();s.startNight(g);assert.equal(s.place(g,'wall',3,3),false);assert.equal(s.cheerBurst(g),true);assert.equal(s.cheerBurst(g),false);advance(g,19);assert.equal(g.santa.burst,0);
});
test('valid saves roundtrip and malformed or incompatible saves fail safely',()=>{
  const g=s.newGame();build(g,'nutcracker',-3,0);advance(g,10);const saved=s.loadGame(s.saveGame(g));assert.ok(saved);assert.equal(saved.stock.wood,g.stock.wood);assert.equal(saved.buildings.length,2);
  for(const raw of ['null','{}','bad',JSON.stringify({...g,version:2}),JSON.stringify({...g,day:55}),JSON.stringify({...g,buildings:[]}),JSON.stringify({...g,santa:{...g.santa,cooldown:'bad'}}),JSON.stringify({...g,santa:{...g.santa,shrineId:99}})])assert.equal(s.loadGame(raw),null);
});
test('an undefended Hearth falls and terminal states stop simulation',()=>{
  const g=s.newGame();g.elves=[];g.santa.recovering=10000;s.startNight(g);advance(g,260);assert.equal(g.phase,'lost');const snapshot=JSON.stringify(g);advance(g,10);assert.equal(JSON.stringify(g),snapshot);
});
test('starting materials support first night with a workshop and two towers',()=>{
  const g=s.newGame();build(g,'workshop',3,0);build(g,'nutcracker',-3,-2);build(g,'nutcracker',-3,4);advance(g,120);advance(g,160);
  assert.notEqual(g.phase,'lost');assert.ok(g.day>=2);assert.ok(g.buildings.find(b=>b.kind==='hearth').hp>0);
});
test('all twelve waves progress to Christmas with an expanded defended settlement',()=>{
  const g=s.newGame();build(g,'workshop',3,0);build(g,'nutcracker',-3,-2);build(g,'nutcracker',-3,4);
  const report=[];
  const sites=[['nutcracker',2,-3],['jackbox',2,4],['snowglobe',-4,0],['nutcracker',5,-2],['jackbox',-2,5],['snowglobe',5,3],['nutcracker',0,-4],['jackbox',-4,-4],['nutcracker',4,7]];
  for(let day=1;day<=12;day++){
    assert.equal(g.phase,'day');assert.equal(g.day,day);
    if(day<=4)s.restoreShrine(g,day);
    advance(g,60);
    if(day>=2){const site=sites.shift();if(site){for(let wait=0;wait<40&&s.placementError(g,...site)==='Santa or an elf is standing here.';wait++)advance(g,.25);build(g,...site);}}
    if(day>=5){const b=g.buildings.find(b=>['nutcracker','jackbox','snowglobe'].includes(b.kind)&&b.level===1&&b.progress===1);if(b&&s.canAfford(g,s.upgradeCost(b)))s.upgrade(g,b.id);}
    s.moveSanta(g,{x:-1,z:2});advance(g,60);s.startNight(g);
    let duration=0;
    while(g.phase==='night'&&duration<240){if(g.santa.burst===0)s.cheerBurst(g);advance(g,1);duration++;}
    report.push({day,duration,hearth:Math.ceil(g.buildings[0].hp),towers:g.buildings.length-2});
    assert.notEqual(g.phase,'lost',JSON.stringify(report));assert.ok(duration<240,JSON.stringify(report));
  }
  assert.equal(g.phase,'won');assert.equal(g.elves.length,12);console.log('Campaign balance:',JSON.stringify(report));
});

test('a saved active siege resumes deterministically without replaying rewards',()=>{
  const g=s.newGame();build(g,'workshop',3,0);build(g,'nutcracker',-3,-2);advance(g,35);s.startNight(g);advance(g,12);
  const resumed=s.loadGame(s.saveGame(g));assert.ok(resumed);advance(g,60);advance(resumed,60);
  assert.equal(resumed.kills,g.kills);assert.equal(resumed.day,g.day);assert.equal(resumed.phase,g.phase);assert.deepEqual(resumed.stock,g.stock);
  assert.deepEqual(resumed.enemies,g.enemies);assert.deepEqual(resumed.buildings,g.buildings);
});
test('a dense late-game siege stays bounded and can damage and destroy defences',()=>{
  const g=s.newGame();g.day=12;g.stock={wood:4000,stone:4000,toys:4000};g.santa.x=8;g.santa.z=0;
  for(let x=-7;x<=7;x+=2)for(const z of [-7,7]){const b=build(g,'wall',x,z);b.progress=1;}
  const original=g.buildings.length;g.elves=[];s.startNight(g);advance(g,200);
  assert.ok(g.enemies.length<=30);assert.ok(g.effects.length<=80);assert.ok(g.buildings.length<original||g.buildings.some(b=>b.hp<b.maxHp));
});

test('the opening defences alone cannot survive the whole campaign',()=>{
  const g=s.newGame();build(g,'workshop',3,0);build(g,'nutcracker',-3,-2);build(g,'nutcracker',-3,4);
  for(let i=0;i<12*400*20&&!['won','lost'].includes(g.phase);i++)s.tick(g,.05);
  assert.equal(g.phase,'lost');assert.ok(g.day>1&&g.day<12);
});

test('gatherers leaving the night shelter finish batches instead of oscillating between resources',()=>{
  const g=s.newGame();g.stock={wood:135,stone:100,toys:0};for(const e of g.elves)Object.assign(e,{x:-1,z:2});advance(g,60);
  assert.ok(g.stock.wood+g.stock.stone>335,JSON.stringify(g.stock));assert.ok(g.stock.wood>135);assert.ok(g.stock.stone>100);
});
