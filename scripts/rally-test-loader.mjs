import {readFile} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import ts from 'typescript';
const cache=new Map();async function moduleUrl(path){if(cache.has(path))return cache.get(path);let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const m of [...code.matchAll(/from ["']([^"']+)["']/g)]){const u=m[1].startsWith('.')?await moduleUrl(resolve(dirname(path),m[1]+'.ts')):import.meta.resolve(m[1]);code=code.replace(m[0],`from '${u}'`);}const u='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(path,u);return u;}

export {moduleUrl};
