import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { moduleUrl } from './rally-test-loader.mjs';
const { photographs, featuredPhotographs } = await import(await moduleUrl(resolve('data/photography.ts')));
const { games, pocketRacers, gameDestination } = await import(await moduleUrl(resolve('data/games.ts')));
const { portfolioTiles, portfolioStudies } = await import(await moduleUrl(resolve('data/portfolio.ts')));
test('gallery has unique, ordered photographs and exactly six featured prints',()=>{
  assert.ok(photographs.length>=6);assert.equal(featuredPhotographs.length,6);
  assert.equal(photographs.filter(photo=>photo.featured).length,6);
  assert.equal(new Set(photographs.map(photo=>photo.id)).size,photographs.length);
  assert.deepEqual(photographs.map(photo=>photo.order),photographs.map(photo=>photo.order).toSorted((a,b)=>a-b));
  for(const photo of photographs){assert.ok(photo.alt);assert.ok(photo.width>0&&photo.height>0);if(photo.placeholder){assert.ok(photo.credit);assert.match(photo.sourceUrl,/^https:\/\/unsplash.com\/photos\//);assert.match(photo.src,/^https:\/\/images.unsplash.com\/photo-/);}}
});
test('Pocket Racers falls back internally and uses the supplied store URL when configured',()=>{
  assert.equal(pocketRacers.metaStoreUrl,undefined);
  assert.equal(gameDestination(pocketRacers),'/playground/pocket-racers-vr');
  const configured={...pocketRacers,metaStoreUrl:'https://www.meta.com/experiences/example-test-only/'};
  assert.equal(gameDestination(configured),configured.metaStoreUrl);
});
test('existing homepage projects and games remain, with four additions',async()=>{
  assert.deepEqual(games.map(game=>game.slug),['rally','soccer98','the-anomalous','hallowseve26','pocket-racers-vr']);
  assert.equal(portfolioTiles.length,8);
  for(const slug of ['agent-toolkit','agent-analytics-in-novus','frontend-101']){
    const study=portfolioStudies.find(item=>item.slug===slug);assert.ok(study?.focus);assert.equal(study.source,undefined);assert.equal(study.conceptual,true);
  }
  for(const item of [...portfolioTiles,...games])if(item.image)await access(resolve('public',item.image.slice(1)));
});
