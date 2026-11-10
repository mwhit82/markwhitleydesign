import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile(new URL('../data/photography-depth.json',import.meta.url)));
const originals=JSON.parse(await readFile(new URL('../data/photography-generated.json',import.meta.url)));
assert.equal(manifest.photos.length,3);
assert.equal(new Set(manifest.photos.map(p=>p.id)).size,3);
for(const depth of manifest.photos){
 const photo=originals.photos.find(p=>p.id===depth.id);assert.ok(photo,'Depth belongs to a published photograph');
 assert.ok(photo.variants.some(v=>v.src===depth.imageSrc),'Depth colour source is a prepared variant');
 assert.match(depth.src,/^\/images\/photography\/depth\/[a-z0-9-]+\.png$/);
 assert.ok(depth.strength>=0&&depth.strength<=.025);
 assert.ok(Math.abs(depth.width/depth.height-photo.width/photo.height)<.005);
 const file=new URL(`../public${depth.src}`,import.meta.url);assert.equal((await stat(file)).size,depth.bytes);
 const png=await readFile(file);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),depth.width);assert.equal(png.readUInt32BE(20),depth.height);
}
console.log('✓ Three depth maps match published images, dimensions, size and displacement limits');
