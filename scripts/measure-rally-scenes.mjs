import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const cache=new Map();
async function moduleUrl(path){
 if(cache.has(path))return cache.get(path);
 let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from ["']([^"']+)["']/g)]){const spec=match[1],url=spec.startsWith('.')?await moduleUrl(resolve(dirname(path),spec+'.ts')):import.meta.resolve(spec);code=code.replace(match[0],`from '${url}'`);}
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(path,url);return url;
}

// Geometry workload only, not a device FPS benchmark. Optional argument: baseline checkout.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const T=await import('three');
for(const [label,root] of [...(process.argv[2]?[['V2.7.3',process.argv[2]]]:[]),['V3',process.cwd()]]){
 const {StageScenery}=await import(await moduleUrl(resolve(root,'components/rally/scenery.ts')));
 const S=await import(await moduleUrl(resolve(root,'components/rally/stages.ts')));
 for(const stage of label==='V3'?['kart','nyc']:['kart']){const selection={stage,weather:'clear',reverse:false,track:1,circuitVersion:2},points=S.stagePoints(selection);const scene=new StageScenery(selection,points,()=>false);let meshes=0,triangles=0;scene.group.traverse(o=>{if(o instanceof T.Mesh){meshes++;const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});console.log(label,stage,{meshes,triangles});}
}
