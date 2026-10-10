import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const stages=uri(compile(await readFile(new URL('../components/rally/stages.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`));
const {browseRequest}=await import(uri(compile(await readFile(new URL('../lib/rally/browse.ts',import.meta.url),'utf8')).replace("'../../components/rally/stages'",JSON.stringify(stages))));
test('central boards include all 294 legacy and day boards; filters select exact existing keys',()=>{
 const all=browseRequest(new URLSearchParams());assert.equal(all.keys.length,294);assert.equal(new Set(all.keys).size,294);assert.ok(all.keys.includes('rally:v2:forest:clear:forward'));
 const one=browseRequest(new URLSearchParams('stage=alpine&weather=snow&reverse=true&timeOfDay=night&car=2&track=1&search=Mark'));assert.equal(one.keys.length,1);assert.equal(one.keys[0],'rally:v2:alpine:snow:reverse:night:car2');assert.equal(one.search,'mark');
 for(const query of ['stage=oops','weather=thunder','reverse=1','timeOfDay=noon','car=99','cursor=-1:0','cursor=295:0','cursor=0:20000000'])assert.equal(browseRequest(new URLSearchParams(query)),null,query);
 const next=browseRequest(new URLSearchParams('cursor=40:2000'));assert.equal(next.board,40);assert.equal(next.offset,2000);
});
