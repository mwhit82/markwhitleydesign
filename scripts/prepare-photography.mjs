import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTHS = [480, 960, 1600, 2400, 3840];
const PIPELINE = `photography-v1-sharp-${sharp.versions.sharp}`;
const supported = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch(error) { if(error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}
async function writeAtomic(file, text) {
  await fs.mkdir(path.dirname(file), {recursive:true});
  try { if(await fs.readFile(file,'utf8') === text) return; } catch(error) { if(error.code !== 'ENOENT') throw error; }
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temporary,text); await fs.rename(temporary,file); }
  finally { await fs.rm(temporary,{force:true}); }
}
async function scan(directory, prefix='') {
  const files=[];
  for(const item of await fs.readdir(directory,{withFileTypes:true})) {
    if(item.name.startsWith('.')) continue;
    const relative=path.posix.join(prefix,item.name);
    if(item.isSymbolicLink()) throw new Error(`Symbolic links are not accepted: ${relative}`);
    if(item.isDirectory()) files.push(...await scan(path.join(directory,item.name),relative));
    else if(item.isFile()) files.push(relative);
  }
  return files.sort();
}
function validateCatalog(catalog, placeholders) {
  if(catalog.version !== 1 || !Array.isArray(catalog.photos) || typeof catalog.includePlaceholders !== 'boolean') throw new Error('Catalogue must have version:1, includePlaceholders and a photos array.');
  if(!Array.isArray(catalog.featuredIds) || catalog.featuredIds.length !== 6 || new Set(catalog.featuredIds).size !== 6) throw new Error('Select exactly six unique featuredIds.');
  const ids=new Set(), sources=new Set(), effectiveIds=new Set();
  for(const photo of catalog.photos) {
    if(typeof photo.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(photo.id) || ids.has(photo.id)) throw new Error(`Invalid or duplicate photo ID: ${photo.id}`);
    ids.add(photo.id);
    if(typeof photo.source !== 'string' || !photo.source || photo.source.includes('\\') || path.posix.isAbsolute(photo.source) || photo.source.split('/').some(part=>part === '..' || part === '.' || !part) || sources.has(photo.source)) throw new Error(`Invalid or duplicate source path for ${photo.id}`);
    sources.add(photo.source);
    if(typeof photo.published !== 'boolean' || !Number.isFinite(photo.order)) throw new Error(`Set published and a numeric order for ${photo.id}`);
    for(const key of ['alt','title','description','location']) if(photo[key] !== undefined && typeof photo[key] !== 'string') throw new Error(`${key} must be text for ${photo.id}`);
    if(photo.replacesId && !placeholders.some(item=>item.id === photo.replacesId)) throw new Error(`Unknown placeholder ${photo.replacesId}`);
    const effectiveId=photo.replacesId || photo.id;
    if(effectiveIds.has(effectiveId)) throw new Error(`Duplicate display ID: ${effectiveId}`);
    effectiveIds.add(effectiveId);
    if(!photo.replacesId && placeholders.some(item=>item.id === photo.id)) throw new Error(`Use replacesId to replace ${photo.id}; keep a separate original ID.`);
    for(const [format,fallback] of [['avif',65],['webp',85]]) {
      const quality=photo.quality?.[format] ?? fallback;
      if(!Number.isInteger(quality) || quality<1 || quality>100) throw new Error(`Invalid ${format} quality for ${photo.id}`);
    }
    if(photo.published && (!photo.alt || photo.alt.trim().length<12 || /^(image|photo|photograph|untitled|todo|description)([\s\d._-]*)$/i.test(photo.alt.trim()) || photo.alt.trim()===photo.source || photo.alt.trim()===photo.id)) throw new Error(`Write descriptive alt text before publishing ${photo.id}`);
  }
  const displayIds=new Set(catalog.includePlaceholders ? placeholders.map(photo=>photo.id) : []);
  catalog.photos.filter(photo=>photo.published).forEach(photo=>displayIds.add(photo.replacesId || photo.id));
  for(const id of catalog.featuredIds) if(!displayIds.has(id)) throw new Error(`Featured photo ${id} is not published or available.`);
}
async function sumFiles(directory) {
  let bytes=0;
  try { for(const file of await scan(directory)) bytes+=(await fs.stat(path.join(directory,file))).size; }
  catch(error) { if(error.code !== 'ENOENT') throw error; }
  return bytes;
}

export async function preparePhotography({root=process.cwd()}={}) {
  const input=path.join(root,'photography-originals');
  const work=path.join(root,'.photography-work');
  const output=path.join(root,'public/images/photography/generated');
  const catalogPath=path.join(root,'data/photography-catalog.json');
  const manifestPath=path.join(root,'data/photography-generated.json');
  await fs.mkdir(input,{recursive:true}); await fs.mkdir(work,{recursive:true});
  // Avoid two runs replacing a catalogue or manifest concurrently.
  const lockPath=path.join(work,'prepare.lock');
  let lock;
  try { lock=await fs.open(lockPath,'wx'); }
  catch(error) { if(error.code==='EEXIST')throw new Error('Another preparation may be running. If it was interrupted, remove .photography-work/prepare.lock before retrying.');throw error; }
  const report={added:[],processed:[],unchanged:[],drafts:[],errors:[],published:0,generatedBytes:0,publicBytes:0};
  try {
    const placeholders=await readJSON(path.join(root,'data/photography-placeholders.json'));
    const catalog=await readJSON(catalogPath,{version:1,includePlaceholders:true,featuredIds:placeholders.filter(photo=>photo.featured).map(photo=>photo.id),photos:[]});
    validateCatalog(catalog,placeholders);
    const files=await scan(input);
    let order=Math.max(0,...placeholders.map(photo=>photo.order),...catalog.photos.map(photo=>photo.order));
    for(const source of files) {
      if(!supported.has(path.extname(source).toLowerCase())) {report.errors.push(`Unsupported file: ${source}. Export JPEG, PNG or TIFF.`);continue;}
      if(catalog.photos.some(photo=>photo.source===source))continue;
      const stem=path.basename(source,path.extname(source)).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase() || 'photograph';
      let id=stem; if(catalog.photos.some(photo=>photo.id===id) || placeholders.some(photo=>photo.id===id))id=`${stem}-${hash(source).slice(0,8)}`;
      catalog.photos.push({id,source,title:stem.replaceAll('-',' '),description:'',alt:'',order:++order,published:false});
      report.added.push(id);
    }
    validateCatalog(catalog,placeholders);
    // Discovery is saved even if an image fails: the user can fix its catalogue entry.
    await writeAtomic(catalogPath,json(catalog));
    const cache=await readJSON(path.join(work,'cache.json'),{version:1,photos:{}});
    const processed=[];
    for(const entry of catalog.photos) {
      if(!entry.published)report.drafts.push({id:entry.id,reason:!entry.alt?.trim()?'Needs descriptive alt text and publication review':'Ready for publication review'});
      try {
        if(!files.includes(entry.source))throw new Error('Source missing; restore it or remove its catalogue entry. Existing published files are retained.');
        const buffer=await fs.readFile(path.join(input,entry.source));
        if(buffer.length===0)throw new Error('Source is empty or unavailable locally. Download the original from cloud storage first.');
        const quality={avif:entry.quality?.avif ?? 65,webp:entry.quality?.webp ?? 85};
        const contentHash=hash(Buffer.concat([buffer,Buffer.from(json({pipeline:PIPELINE,quality}))])).slice(0,24);
        const folder=path.join(work,'images',contentHash);
        const previous=cache.photos[entry.id];
        let result;
        if(previous?.hash===contentHash && previous.variants?.length) {
          const intact=await Promise.all(previous.variants.map(async variant=>{
            try {return (await fs.stat(path.join(folder,variant.file))).size===variant.bytes;} catch {return false;}
          }));
          if(intact.every(Boolean)) result=previous;
        }
        if(result)report.unchanged.push(entry.id);
        else {
          const meta=await sharp(buffer,{failOn:'warning',limitInputPixels:120000000}).metadata();
          if(!['jpeg','png','tiff'].includes(meta.format))throw new Error('Only JPEG, PNG and TIFF image contents are accepted.');
          if((meta.pages ?? 1)>1)throw new Error('Export a single still image instead of a multi-page file.');
          const rotated=(meta.orientation ?? 1)>4;
          const originalWidth=rotated?meta.height:meta.width, originalHeight=rotated?meta.width:meta.height;
          if(!originalWidth || !originalHeight)throw new Error('Image dimensions could not be read.');
          const maxWidth=Math.min(originalWidth,Math.floor(originalWidth*3840/Math.max(originalWidth,originalHeight)));
          const widths=[...new Set([...WIDTHS.filter(width=>width<maxWidth),maxWidth])].filter(width=>width>0);
          const stage=path.join(work,`stage-${randomUUID()}`);
          await fs.mkdir(stage,{recursive:true});
          const variants=[];
          try {
            for(const width of widths)for(const format of ['avif','webp']) {
              const file=`${width}.${format}`;
              const image=sharp(buffer,{failOn:'warning',limitInputPixels:120000000}).autoOrient().resize({width,withoutEnlargement:true}).withIccProfile('srgb');
              const info=await image.toFormat(format,{quality:quality[format],effort:format==='avif'?5:4}).toFile(path.join(stage,file));
              variants.push({file,format,width:info.width,height:info.height,bytes:info.size});
            }
            await fs.mkdir(folder,{recursive:true});
            for(const variant of variants)await fs.rename(path.join(stage,variant.file),path.join(folder,variant.file));
          } finally {await fs.rm(stage,{recursive:true,force:true});}
          const largest=variants.filter(variant=>variant.format==='webp').at(-1);
          result={hash:contentHash,width:largest.width,height:largest.height,variants};
          report.processed.push(entry.id);
        }
        cache.photos[entry.id]=result;
        report.generatedBytes+=result.variants.reduce((total,variant)=>total+variant.bytes,0);
        processed.push({entry,result});
      } catch(error) {report.errors.push(`${entry.id}: ${error.message}`);}
    }
    await writeAtomic(path.join(work,'cache.json'),json(cache));
    const cards=processed.map(({entry,result})=>{
      const small=result.variants.find(variant=>variant.format==='webp'), large=result.variants.filter(variant=>variant.format==='webp').at(-1);
      return `<figure><a href="images/${result.hash}/${large.file}"><img src="images/${result.hash}/${small.file}" width="${small.width}" height="${small.height}" alt="${escape(entry.alt || entry.title)}" loading="lazy"></a><figcaption><strong>${escape(entry.title || entry.id)}</strong><p>${escape(entry.id)} · ${entry.published?'Published':'Draft'} · ${(result.variants.reduce((sum,v)=>sum+v.bytes,0)/1048576).toFixed(2)} MB</p><p>${escape(entry.alt || 'ALT TEXT NEEDED')}</p><p>${escape(entry.description)}</p></figcaption></figure>`;
    }).join('\n');
    await writeAtomic(path.join(work,'contact-sheet.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Private photography review</title><style>body{font:15px system-ui;background:#f2f0e9;color:#252621;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:28px}figure{margin:0;background:white;padding:16px}img{width:100%;height:240px;object-fit:contain}p{line-height:1.5;overflow-wrap:anywhere}small{color:#555}</style><h1>Private photography review</h1><p>Review colours, fine detail and compression at full size by opening each image. Edit data/photography-catalog.json, then run npm run photos:prepare again.</p><p>${report.drafts.length} drafts · ${report.errors.length} errors</p><main>${cards}</main></html>`);
    // No live assets or manifest change until the entire batch has succeeded.
    if(!report.errors.length) {
      const photos=[];
      for(const {entry,result} of processed.filter(photo=>photo.entry.published)) {
        const destination=path.join(output,result.hash);
        await fs.mkdir(destination,{recursive:true});
        for(const variant of result.variants) {
          const target=path.join(destination,variant.file);
          try {if((await fs.stat(target)).size===variant.bytes)continue;} catch(error) {if(error.code!=='ENOENT')throw error;}
          const temp=`${target}.${randomUUID()}.tmp`;
          try {await fs.copyFile(path.join(work,'images',result.hash,variant.file),temp);await fs.rename(temp,target);}
          finally {await fs.rm(temp,{force:true});}
        }
        const variants=result.variants.map(({file,...variant})=>({...variant,src:`/images/photography/generated/${result.hash}/${file}`}));
        const fallback=variants.filter(variant=>variant.format==='webp').at(-1);
        const id=entry.replacesId || entry.id;
        photos.push({id,title:entry.title || '',description:entry.description || '',alt:entry.alt.trim(),...(entry.location?{location:entry.location}:{}),order:entry.order,featured:catalog.featuredIds.includes(id),placeholder:false,width:result.width,height:result.height,src:fallback.src,variants});
      }
      await writeAtomic(manifestPath,json({version:1,includePlaceholders:catalog.includePlaceholders,featuredIds:catalog.featuredIds,photos}));
      report.published=photos.length;
    }
    report.publicBytes=await sumFiles(output);
    await writeAtomic(path.join(work,'report.json'),json(report));
    return report;
  } catch(error) {
    report.errors.push(error.message);
    await writeAtomic(path.join(work,'report.json'),json(report));
    return report;
  } finally {await lock.close();await fs.rm(lockPath,{force:true});}
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const report=await preparePhotography();
    console.log(`Photography: ${report.added.length} discovered, ${report.processed.length} processed, ${report.unchanged.length} unchanged, ${report.drafts.length} drafts.`);
    console.log(`Processed versions: ${(report.generatedBytes/1048576).toFixed(2)} MB. Public photo storage (including previous versions): ${(report.publicBytes/1048576).toFixed(2)} MB.`);
    console.log('Review .photography-work/contact-sheet.html and .photography-work/report.json.');
    if(report.errors.length){console.error(report.errors.join('\n'));process.exitCode=1;}
    else console.log(`${report.published} original photographs published in the local manifest. Commit and push when ready.`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
