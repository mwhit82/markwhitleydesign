// Exercise a disposable private room only; never submit public scores.
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const origin=process.argv[2];if(!origin?.startsWith('https://'))throw Error('Pass the deployed HTTPS origin');
const stage=process.argv[3]||'nyc',version=3,car=stage==='neon'?9:stage==='mx'?10:0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(check,label,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(check())return;await pause(60);}throw Error(`Timed out: ${label}`);}
const clients=[];
async function connect(entry){
 const c={entry,messages:[],room:null,ws:null};
 c.ws=new WebSocket(origin.replace('https:','wss:')+`/api/rally/rooms/socket?code=${entry.room.code}`,{origin});
 c.ws.on('open',()=>c.ws.send(JSON.stringify({version,type:'hello',id:entry.id,token:entry.token})));
 c.ws.on('message',data=>{const m=JSON.parse(data.toString());c.messages.push(m);if(m.type==='room')c.room=m.room;if(m.type==='error')c.error=m.error;});
 c.ws.on('error',e=>{c.error=e.message;});c.ws.on('close',(code,reason)=>{c.error=`Closed ${code}: ${reason.toString()}`;});
 await wait(()=>c.room||c.error,'authenticated connection');if(c.error)throw Error(c.error);return c;
}
const send=(c,m)=>c.ws.send(JSON.stringify({version,...m}));
try{
 let code;
 for(let i=0;i<4;i++){
  const res=await fetch(origin+'/api/rally/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:`V5 Test ${i+1}`,version,selection:{stage,track:1,weather:'clear',reverse:false,timeOfDay:'midday',laps:1,circuitVersion:2},car,...(code?{code}:{})})});
  const entry=await res.json();assert.equal(res.status,200,JSON.stringify(entry));assert.ok(!entry.room.secrets);code=entry.room.code;clients.push(await connect(entry));
 }
 await wait(()=>clients.every(c=>c.room.members.length===4),'four-member snapshots');
 const full=await fetch(origin+'/api/rally/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'V5 Extra',version,code})});assert.equal(full.status,400);
 if(!['kart','neon','mx'].includes(stage)){
  for(const [i,c] of clients.entries()){send(c,{type:'car',car:i});await pause(220);}
  await wait(()=>clients.every(c=>c.room.members.every((m,i)=>m.car===i)),'individual car snapshots');
  for(const c of clients){send(c,{type:'ready',ready:true});await pause(220);}
  send(clients[1],{type:'car',car:7});await wait(()=>clients.every(c=>c.room.members.every(m=>!m.ready)),'car changes reset ready');
 }
 for(const c of clients){send(c,{type:'ready',ready:true});await pause(220);}
 await wait(()=>clients[0].room.members.every(m=>m.ready),'all ready');send(clients[0],{type:'start'});
 await wait(()=>clients.every(c=>c.room.phase==='racing'),'shared countdown');assert.equal(new Set(clients.map(c=>c.room.startAt)).size,1);
 const startAt=clients[0].room.startAt;await pause(Math.max(0,startAt-Date.now()+100));
 const began=Date.now();send(clients[0],{type:'pose',pose:{x:0,z:0,heading:0,speed:10,progress:.1,...(version>=2?{y:2,pitch:.1,roll:.2}:{})}});
 await wait(()=>clients.slice(1).every(c=>c.messages.some(m=>m.type==='pose')),'cross-instance movement');console.log('Movement delivered to all three rivals within',Date.now()-began,'ms');
 if(version>=2)for(const c of clients.slice(1)){const m=c.messages.find(m=>m.type==='pose');assert.equal(m.pose.y,2);assert.equal(m.pose.pitch,.1);}
 const entry=clients[3].entry;clients[3].ws.close();await pause(900);clients[3]=await connect(entry);assert.equal(clients[3].room.attempt,1);
 send(clients[2],{type:'unknown',version:99});await wait(()=>clients[2].messages.some(m=>m.type==='error'&&/version/.test(m.error)),'version rejection');
 await pause(300);
 for(const c of clients){send(c,{type:'finish',attempt:1,time:Math.max(1,(Date.now()-startAt)/1000-.1),trace:[],practice:true});await pause(250);}
 await wait(()=>clients.every(c=>c.room.phase==='results'),'results');assert.ok(clients[0].room.members.every(m=>m.practice&&m.status==='finished'));
 const frozen=clients[0].room.members[0].time;send(clients[0],{type:'finish',attempt:1,time:1,trace:[],practice:true});await pause(350);assert.equal(clients[0].room.members[0].time,frozen);
 send(clients[0],{type:'again'});await wait(()=>clients.every(c=>c.room.phase==='lobby'),'rematch');await pause(250);send(clients[0],{type:'leave'});await wait(()=>clients[1].room.host===clients[1].entry.id,'host migration');
 clients[1].ws.close();await wait(()=>clients[2].room.host===clients[2].entry.id,'host disconnect expiry',26000);
 await assert.rejects(()=>connect(clients[1].entry),/membership|expired/i);
 console.log('PASS: four clients, capacity, countdown, movement, reconnect, expiry, version rejection, practice finish, deduplication, rematch and host migration');
}finally{for(const c of clients){if(c.ws.readyState===1)send(c,{type:'leave'});setTimeout(()=>c.ws.close(),300);}}
