import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { checkPhotography } from './check-photography.mjs';
import { preparePhotography } from './prepare-photography.mjs';

async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'photography-test-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'data'));await fs.mkdir(path.join(root,'photography-originals'));
  const placeholders=Array.from({length:6},(_,i)=>({id:`frame-${i+1}`,order:i+1,featured:true}));
  await fs.writeFile(path.join(root,'data/photography-placeholders.json'),JSON.stringify(placeholders));
  return root;
}
const read=(root,file)=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse);
const catalog=root=>read(root,'data/photography-catalog.json');
const saveCatalog=(root,value)=>fs.writeFile(path.join(root,'data/photography-catalog.json'),JSON.stringify(value));
async function photo(root,name='coast.jpg',options={width:120,height:80}) {
  const source=sharp({create:{...options,channels:3,background:'#5c897d'}});
  await source.jpeg().toFile(path.join(root,'photography-originals',name));
}
async function publish(root, mutate=()=>{}) {
  const c=await catalog(root);c.photos[0].published=true;c.photos[0].alt='A green test image used to check the local photo workflow.';mutate(c);
  await saveCatalog(root,c);return preparePhotography({root});
}

test('discovers private drafts, preserves originals and metadata, and skips unchanged encoding',async t=>{
  const root=await fixture(t);await photo(root);
  const source=await fs.readFile(path.join(root,'photography-originals/coast.jpg'));
  const first=await preparePhotography({root});assert.deepEqual(first.errors,[]);assert.equal(first.processed.length,1);assert.equal(first.drafts.length,1);
  assert.equal((await read(root,'data/photography-generated.json')).photos.length,0);
  await assert.rejects(fs.access(path.join(root,'public/images/photography/generated')));
  const c=await catalog(root);c.photos[0].title='My coastal study';c.photos[0].order=2;c.photos[0].description='My retained caption';await saveCatalog(root,c);
  const second=await preparePhotography({root});assert.equal(second.processed.length,0);assert.deepEqual(second.unchanged,['coast']);
  assert.equal((await catalog(root)).photos[0].description,'My retained caption');
  assert.deepEqual(await fs.readFile(path.join(root,'photography-originals/coast.jpg')),source);
  assert.match(await fs.readFile(path.join(root,'.photography-work/contact-sheet.html'),'utf8'),/My coastal study/);
});

test('publishes responsive variants, replaces a placeholder ID, and never upscales',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});
  const result=await publish(root,c=>{c.photos[0].replacesId='frame-1';c.photos[0].order=1;});assert.deepEqual(result.errors,[]);
  const manifest=await read(root,'data/photography-generated.json');const p=manifest.photos[0];
  assert.equal(p.id,'frame-1');assert.equal(p.featured,true);assert.equal(p.placeholder,false);assert.equal(p.width,120);assert.equal(p.height,80);
  assert.equal(p.variants.length,2);
  for(const v of p.variants){assert.ok(v.width<=120);const data=await fs.readFile(path.join(root,'public',v.src));assert.equal(data.length,v.bytes);assert.equal((await sharp(data).metadata()).width,v.width);}
  assert.ok(!JSON.stringify(manifest).includes('source"'));assert.ok(!JSON.stringify(manifest).includes('photography-originals'));
});

test('corrects EXIF orientation, converts to sRGB, and removes private metadata',async t=>{
  const root=await fixture(t);
  await sharp({create:{width:40,height:80,channels:3,background:'red'}}).jpeg().withMetadata({orientation:6}).withExifMerge({IFD0:{Artist:'Private camera owner'}}).toFile(path.join(root,'photography-originals/portrait.jpg'));
  await preparePhotography({root});await publish(root);
  const p=(await read(root,'data/photography-generated.json')).photos[0];assert.equal(p.width,80);assert.equal(p.height,40);
  for(const v of p.variants){const m=await sharp(path.join(root,'public',v.src)).metadata();assert.equal(m.exif,undefined);assert.equal(m.orientation,undefined);assert.ok(m.icc);assert.equal(m.space,'srgb');}
});

test('accepts TIFF and PNG, bounds the longest edge, and generates distinct width candidates',async t=>{
  const root=await fixture(t);await sharp({create:{width:500,height:4000,channels:3,background:'#779999'}}).tiff().toFile(path.join(root,'photography-originals/tall.tiff'));
  await sharp({create:{width:600,height:300,channels:4,background:'#998877'}}).png().toFile(path.join(root,'photography-originals/wide.png'));
  const report=await preparePhotography({root});assert.deepEqual(report.errors,[]);const c=await catalog(root);
  for(const p of c.photos){p.published=true;p.alt='A synthetic colour sample for testing the image processor.';}await saveCatalog(root,c);await preparePhotography({root});
  const manifest=await read(root,'data/photography-generated.json');
  for(const p of manifest.photos)for(const v of p.variants)assert.ok(Math.max(v.width,v.height)<=3840);
  const wide=manifest.photos.find(p=>p.id==='wide');assert.deepEqual(wide.variants.filter(v=>v.format==='webp').map(v=>v.width),[480,600]);
});

test('failed batches leave the last published manifest and its images untouched',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});await publish(root);
  const manifest=await fs.readFile(path.join(root,'data/photography-generated.json'));
  await fs.writeFile(path.join(root,'photography-originals/broken.jpg'),'not an image');
  await fs.writeFile(path.join(root,'photography-originals/camera.raw'),'unsupported');
  const result=await preparePhotography({root});assert.equal(result.errors.length,2);
  assert.deepEqual(await fs.readFile(path.join(root,'data/photography-generated.json')),manifest);
  const p=JSON.parse(manifest).photos[0];for(const v of p.variants)await fs.access(path.join(root,'public',v.src));
});

test('rejects duplicate IDs, source traversal, missing alt and invalid featured selections',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});const original=await catalog(root);
  for(const mutate of [
    c=>c.photos.push({...c.photos[0],source:'another.jpg'}),
    c=>{c.photos[0].source='../private.jpg';},
    c=>{c.photos[0].published=true;},
    c=>{c.featuredIds[0]='unknown';},
    c=>{c.featuredIds.pop();},
  ]){const c=structuredClone(original);mutate(c);await saveCatalog(root,c);assert.ok((await preparePhotography({root})).errors.length);}
});

test('quality overrides create new content-addressed files without deleting previous published versions',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});await publish(root);
  const previous=(await read(root,'data/photography-generated.json')).photos[0];
  const c=await catalog(root);c.photos[0].quality={avif:75,webp:95};await saveCatalog(root,c);
  const result=await preparePhotography({root});assert.deepEqual(result.processed,['coast']);
  const next=(await read(root,'data/photography-generated.json')).photos[0];assert.notEqual(previous.src,next.src);await fs.access(path.join(root,'public',previous.src));
});

test('missing or unavailable originals fail safely without dropping published content',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});await publish(root);
  const before=await fs.readFile(path.join(root,'data/photography-generated.json'));
  await fs.unlink(path.join(root,'photography-originals/coast.jpg'));
  assert.ok((await preparePhotography({root})).errors.some(e=>e.includes('Source missing')));
  assert.deepEqual(await fs.readFile(path.join(root,'data/photography-generated.json')),before);
});

test('deployment checks require complete generated files without needing originals',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});await publish(root);
  await fs.rm(path.join(root,'photography-originals'),{recursive:true});
  assert.deepEqual(await checkPhotography(root),{originals:1,featured:6});
  const p=(await read(root,'data/photography-generated.json')).photos[0];
  await fs.unlink(path.join(root,'public',p.src));
  await assert.rejects(checkPhotography(root),/Missing or incomplete image/);
});

function exposureExif(endian='II') {
  const tiff=Buffer.alloc(104);tiff.write(endian);
  const short=(value,offset)=>endian==='II'?tiff.writeUInt16LE(value,offset):tiff.writeUInt16BE(value,offset);
  const long=(value,offset)=>endian==='II'?tiff.writeUInt32LE(value,offset):tiff.writeUInt32BE(value,offset);
  short(42,2);long(8,4);short(1,8);short(0x8769,10);short(4,12);long(1,14);long(26,18);
  short(4,26);
  for(const [index,tag,type,value] of [[0,0x829a,5,80],[1,0x829d,5,88],[2,0x8827,3,800],[3,0x920a,5,96]]) {
    const offset=28+index*12;short(tag,offset);short(type,offset+2);long(1,offset+4);
    if(type===3)short(value,offset+8);else long(value,offset+8);
  }
  long(1,80);long(125,84);long(28,88);long(10,92);long(235,96);long(10,100);
  return Buffer.concat([Buffer.from('Exif\0\0'),tiff]);
}

test('reads only exposure settings with either EXIF byte order and ignores malformed metadata',async()=>{
  const {cameraSettingsFromExif}=await import('./photo-camera-settings.mjs');
  for(const endian of ['II','MM'])assert.deepEqual(cameraSettingsFromExif(exposureExif(endian)),{aperture:2.8,shutterSeconds:0.008,iso:800,focalLengthMm:23.5});
  for(const data of [undefined,Buffer.from('invalid'),exposureExif().subarray(0,30)])assert.equal(cameraSettingsFromExif(data),undefined);
  const missing=exposureExif();missing.writeUInt16LE(0x920b,70);assert.equal(cameraSettingsFromExif(missing).focalLengthMm,undefined);
  const zero=exposureExif();zero.writeUInt32LE(0,90);assert.equal(cameraSettingsFromExif(zero).shutterSeconds,undefined);
});

test('publishes exposure labels from originals even on cached imports while keeping output EXIF stripped',async t=>{
  const root=await fixture(t);await photo(root);
  const file=path.join(root,'photography-originals/coast.jpg');const jpeg=await fs.readFile(file);
  const exif=exposureExif();const header=Buffer.alloc(4);header.writeUInt16BE(0xffe1);header.writeUInt16BE(exif.length+2,2);
  await fs.writeFile(file,Buffer.concat([jpeg.subarray(0,2),header,exif,jpeg.subarray(2)]));
  const original=await fs.readFile(file);await preparePhotography({root});await publish(root);
  const result=await preparePhotography({root});assert.deepEqual(result.unchanged,['coast']);
  const p=(await read(root,'data/photography-generated.json')).photos[0];
  assert.deepEqual(p.cameraSettings,{aperture:2.8,shutterSeconds:0.008,iso:800,focalLengthMm:23.5});
  for(const v of p.variants)assert.equal((await sharp(path.join(root,'public',v.src)).metadata()).exif,undefined);
  assert.deepEqual(await fs.readFile(file),original);
});

test('deployment check rejects non-exposure metadata and invalid camera settings',async t=>{
  const root=await fixture(t);await photo(root);await preparePhotography({root});await publish(root);
  const manifest=await read(root,'data/photography-generated.json');
  for(const cameraSettings of [{gps:'private'},{aperture:-2},{shutterSeconds:0},{iso:12.5},{focalLengthMm:0},{focalLengthMm:10001}]) {
    manifest.photos[0].cameraSettings=cameraSettings;
    await fs.writeFile(path.join(root,'data/photography-generated.json'),JSON.stringify(manifest));
    await assert.rejects(checkPhotography(root),/Unexpected camera setting/);
  }
});
