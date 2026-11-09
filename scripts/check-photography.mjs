import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function checkPhotography(root=process.cwd()) {
  const read=async name=>JSON.parse(await fs.readFile(path.join(root,'data',name),'utf8'));
  const manifest=await read('photography-generated.json');
  const placeholders=await read('photography-placeholders.json');
  if(manifest.version!==1 || !Array.isArray(manifest.photos) || typeof manifest.includePlaceholders!=='boolean')throw new Error('Invalid photography manifest. Run npm run photos:prepare.');
  if(!Array.isArray(manifest.featuredIds) || manifest.featuredIds.length!==6 || new Set(manifest.featuredIds).size!==6)throw new Error('Photography must have exactly six featured selections.');
  const originalIds=new Set();
  for(const photo of manifest.photos) {
    if(originalIds.has(photo.id))throw new Error(`Duplicate generated photo: ${photo.id}`);
    originalIds.add(photo.id);
    if(!photo.alt?.trim() || photo.placeholder!==false || !photo.variants?.length)throw new Error(`Incomplete published photo: ${photo.id}`);
    if(!Number.isFinite(photo.order) || photo.width<=0 || photo.height<=0)throw new Error(`Invalid dimensions or order: ${photo.id}`);
    for(const format of ['avif','webp']) {
      const variants=photo.variants.filter(variant=>variant.format===format);
      if(!variants.length || new Set(variants.map(variant=>variant.width)).size!==variants.length)throw new Error(`Invalid ${format} sizes: ${photo.id}`);
    }
    for(const variant of photo.variants) {
      if(!/^\/images\/photography\/generated\/[a-f0-9]{24}\/\d+\.(avif|webp)$/.test(variant.src))throw new Error(`Unexpected generated image path: ${photo.id}`);
      if(variant.width<=0 || variant.height<=0 || Math.max(variant.width,variant.height)>3840 || variant.bytes<=0)throw new Error(`Invalid image variant: ${photo.id}`);
      const file=path.join(root,'public',variant.src);
      try {if((await fs.stat(file)).size!==variant.bytes)throw new Error('wrong size');}
      catch {throw new Error(`Missing or incomplete image ${variant.src}. Commit the generated files with the manifest.`);}
    }
    if(!photo.variants.some(variant=>variant.src===photo.src && variant.format==='webp'))throw new Error(`Missing WebP fallback: ${photo.id}`);
  }
  const allIds=new Set([...(manifest.includePlaceholders?placeholders.map(photo=>photo.id):[]),...originalIds]);
  for(const id of manifest.featuredIds)if(!allIds.has(id))throw new Error(`Unavailable featured photo: ${id}`);
  return {originals:manifest.photos.length,featured:manifest.featuredIds.length};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const result=await checkPhotography();console.log(`Photography assets verified: ${result.originals} originals, ${result.featured} featured selections.`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
