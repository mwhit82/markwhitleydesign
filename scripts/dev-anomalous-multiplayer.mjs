// Native local adapter. Production uses the Vercel route and Redis repository.
import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import {resolve} from 'node:path';
import {moduleUrl} from './rally-test-loader.mjs';
const {memoryRepository,enterRoom}=await import(await moduleUrl(resolve('lib/deader/multiplayer/repository.ts')));
const {connectSocket}=await import(await moduleUrl(resolve('lib/deader/multiplayer/socket.ts')));
const repo=memoryRepository(),origin=process.env.COOP_LOCAL_ORIGIN||'http://localhost:3000';
const server=createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','content-type');res.setHeader('Cache-Control','no-store');
 if(req.headers.origin!==origin){res.writeHead(403).end();return;}
 if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 if(req.method!=='POST'||req.url!=='/api/deader/rooms'){res.writeHead(404).end();return;}
 try{let text='';for await(const chunk of req){text+=chunk;if(text.length>5000)throw Error('Request too large');}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await enterRoom(repo,JSON.parse(text))));}
 catch(e){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:e.message}));}
});
const wss=new WebSocketServer({noServer:true,maxPayload:24000});
server.on('upgrade',(req,socket,head)=>{
 const u=new URL(req.url,'http://localhost');const code=u.searchParams.get('code')??'';
 if(req.headers.origin!==origin||u.pathname!=='/api/deader/rooms/socket'||!/^[A-Z2-9]{6}$/.test(code)){socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>connectSocket(ws,code,repo));
});
server.listen(3001,'127.0.0.1',()=>console.log('Anomalous local multiplayer ready on http://localhost:3001'));
