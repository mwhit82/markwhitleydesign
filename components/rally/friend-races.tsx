'use client';
import {useEffect,useRef,useState} from 'react';
import type {RallyWorld} from './world';
import type {RaceRoom,LivePose} from './room-types';
import {boardKey,trackName,timeNames,timeOfDay,weatherNames,type StageSelection} from './stages';
import {cars,formatTime} from './data';
import styles from './rally.module.css';
type Session={room:RaceRoom;id:string;token:string};
export function FriendRaces({world,selection,car,ready,mode,onSetup,onActive}:{world:()=>RallyWorld|null;selection:StageSelection;car:number;ready:boolean;mode:string;onSetup:(s:StageSelection,car:number)=>void;onActive:(active:boolean)=>void}){
 const [open,setOpen]=useState(false),[room,setRoom]=useState<RaceRoom|null>(null),[name,setName]=useState('Driver'),[code,setCode]=useState(''),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[liveMenu,setLiveMenu]=useState(false);
 const session=useRef<Session|null>(null),socket=useRef<WebSocket|null>(null),generation=useRef(0),attempt=useRef(-1),offset=useRef(0),lostAt=useRef(0),retry=useRef<ReturnType<typeof setTimeout>|null>(null),poses=useRef(new Map<string,LivePose>());
 const pendingFinish=useRef<Record<string,unknown>|null>(null);
 const callbacks=useRef({world,onSetup,onActive});callbacks.current={world,onSetup,onActive};
 const send=(payload:Record<string,unknown>)=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify({version:1,...payload}));};
 const leave=()=>{send({type:'leave'});generation.current++;if(retry.current)clearTimeout(retry.current);socket.current?.close();session.current=null;pendingFinish.current=null;setRoom(null);setConnected(false);setLiveMenu(false);setOpen(false);attempt.current=-1;const w=callbacks.current.world();if(w){w.roomJoined=false;w.leaveLive();}callbacks.current.onActive(false);try{sessionStorage.removeItem('rally-room');}catch{}};
 const connect=(entry:Session)=>{
  session.current=entry;const rev=++generation.current;setRoom(entry.room);setOpen(true);callbacks.current.onActive(true);const joined=callbacks.current.world();if(joined)joined.roomJoined=true;
  const boot=()=>{
   if(rev!==generation.current)return;
   const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rally/rooms/socket?code=${entry.room.code}`);socket.current=ws;
   ws.onopen=()=>{if(rev!==generation.current){ws.close();return;}ws.send(JSON.stringify({version:1,type:'hello',id:entry.id,token:entry.token}));};
   ws.onmessage=e=>{if(rev!==generation.current)return;let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='error'){setError(m.error);return;}
    if(m.type==='pose'){const p=m.pose as LivePose;if(p.id!==entry.id){poses.current.set(p.id,p);const w=callbacks.current.world();if(w&&w.live)w.rivals.receive(p,w.vehicle);}return;}
    if(m.type!=='room')return;setConnected(true);lostAt.current=0;setError('');offset.current=m.now-Date.now();const r=m.room as RaceRoom;if(r.version!==1){setError('Game updated. Refresh to join.');return;}const previousPhase=entry.room.phase;entry.room=r;setRoom(r);
    try{sessionStorage.setItem('rally-room',JSON.stringify(entry));}catch{}
    const w=callbacks.current.world();if(!w)return;
    if(r.phase==='lobby'){if(w.mode!=='garage')w.garage();if(r.host!==entry.id&&(boardKey(w.selection)!==boardKey(r.selection)||w.selected!==r.car))callbacks.current.onSetup(r.selection,r.car);if(previousPhase!=='lobby')setOpen(true);w.live=false;w.rivals.clear();}
    if(r.phase==='racing'&&attempt.current!==r.attempt){attempt.current=r.attempt;pendingFinish.current=null;callbacks.current.onSetup(r.selection,r.car);w.beginLive(r.startAt-offset.current);setOpen(false);setLiveMenu(false);}
    if(r.phase==='results'){setOpen(true);if(w.mode==='race'||w.mode==='countdown'){w.leaveLive();}}
    const seat=r.members.find(p=>p.id===entry.id);if(seat?.status==='finished')pendingFinish.current=null;else if(seat?.status==='racing'&&pendingFinish.current)send(pendingFinish.current);if(!seat||seat.status==='disconnected'){setError('Reconnect window expired. Leave and rejoin for the next race.');w.leaveLive();}
   };
   ws.onclose=()=>{if(rev!==generation.current)return;setConnected(false);lostAt.current ||=Date.now();if(Date.now()-lostAt.current<20000){setError('Reconnecting… your race clock continues.');retry.current=setTimeout(boot,1000);}else{setError('Connection lost. Leave the room to return to solo racing.');setOpen(true);callbacks.current.world()?.leaveLive();}};
   ws.onerror=()=>{setError('Live connection unavailable. Solo racing still works.');};
  };boot();
 };
 useEffect(()=>{const invite=new URLSearchParams(location.search).get('room');if(invite){setCode(invite.toUpperCase().slice(0,6));setOpen(true);}try{const saved=localStorage.getItem('rally-room-name');if(saved)setName(saved);}catch{}const currentGeneration=generation;return()=>{currentGeneration.current++;if(retry.current)clearTimeout(retry.current);socket.current?.close();};},[]);
 useEffect(()=>{if(!ready)return;const w=callbacks.current.world();if(!w)return;w.onLiveMenu=setLiveMenu;w.onLivePose=(pose,recovered)=>send({type:'pose',pose,recovered});w.onLiveFinish=(time,trace,practice)=>{pendingFinish.current={type:'finish',attempt:attempt.current,time,trace,practice};send(pendingFinish.current);};return()=>{w.onLiveMenu=null;w.onLivePose=null;w.onLiveFinish=null;};},[ready]);
 useEffect(()=>{const w=callbacks.current.world();if(w){w.roomMenuOpen=open||liveMenu;w.onRoomBack=()=>{setOpen(false);setLiveMenu(false);};w.menuOpen=open||liveMenu;if(w.live)w.liveMenu=open||liveMenu;}},[open,liveMenu,ready]);
 const enter=async(join:boolean)=>{setBusy(true);setError('');try{const response=await fetch('/api/rally/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,selection,car,...(join?{code}:{})})});const data=await response.json();if(!response.ok)throw Error(data.error||'Room unavailable');try{localStorage.setItem('rally-room-name',name);}catch{}connect(data);}catch(e){setError(e instanceof Error?e.message:'Could not join');}finally{setBusy(false);}};
 const me=room?.members.find(p=>p.id===session.current?.id),host=room?.host===session.current?.id;
 return <>
  {(mode==='garage'||room)&&<button className={`${styles.friendsLaunch} ${mode!=='garage'?styles.friendsInRace:''}`} disabled={!ready} onClick={()=>setOpen(true)}>{room?`Room ${room.code}`:'Race friends'}</button>}
  {room&&!open&&<div className={styles.roomStandings}>{room.members.map(m=><span key={m.id}>{m.id===session.current?.id?'You':m.name} · {m.time!==undefined?formatTime(m.time):m.status==='racing'?`${Math.round((poses.current.get(m.id)?.progress??0)*100)}%`:m.status}</span>)}</div>}
  {(open||liveMenu)&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Race friends" data-rally-menu="true"><div className={styles.roomCard}>
   <span className={styles.tag}>PRIVATE RACE · UP TO FOUR DRIVERS</span><h2>{room?room.code:'Race friends'}</h2>
   {error&&<p role="alert">{error}</p>}
   {!room?<><label>Your name<input maxLength={20} value={name} onChange={e=>setName(e.target.value)}/></label><p>{trackName(selection)} · {cars[car].name}</p><button disabled={busy} onClick={()=>enter(false)}>Create room with this setup</button><label>Friend’s code<input maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><button disabled={busy||code.length!==6} onClick={()=>enter(true)}>Join code</button><button onClick={()=>setOpen(false)}>Back</button></>:<>
    <p>{trackName(room.selection)} · {cars[room.car].name} · {weatherNames[room.selection.weather]} · {timeNames[timeOfDay(room.selection)]}</p>
    <p>{connected?'Connected':'Connecting…'} · {room.phase==='racing'?'Race continues while this menu is open. Your car brakes automatically.':'All drivers use the same car and conditions.'}</p>
    <ol>{[...room.members].sort((a,b)=>(a.practice?1:0)-(b.practice?1:0)||(a.time??Infinity)-(b.time??Infinity)).map(m=><li key={m.id}>{m.name}{m.id===session.current?.id?' · You':''} — {m.time!==undefined?`${formatTime(m.time)}${m.practice?' · Practice':''}`:m.ready&&room.phase==='lobby'?'Ready':m.status}</li>)}</ol>
    {room.phase==='lobby'&&<><button disabled={!connected} onClick={()=>send({type:'ready',ready:!me?.ready})}>{me?.ready?'Not ready':'Ready to race'}</button>{host&&<><button disabled={!connected||room.members.length<2||!room.members.every(p=>p.ready)} onClick={()=>send({type:'start'})}>Start together</button><button onClick={()=>setOpen(false)}>Choose setup in garage</button><button disabled={!connected} onClick={()=>send({type:'setup',selection,car})}>Use current garage setup</button></>}<button onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/playground/rally?room=${room.code}`);setError('Invite link copied.');}catch{setError(`Share code ${room.code}`);}}}>Copy invite link</button></>}
    {room.phase==='results'&&host&&<button disabled={!connected} onClick={()=>send({type:'again'})}>Race again</button>}
    {room.phase==='racing'&&<button onClick={()=>{setOpen(false);setLiveMenu(false);const w=world();if(w)w.liveMenu=false;}}>Resume driving</button>}
    <button onClick={leave}>Leave room — return to solo</button>
   </>}
  </div></div>}
 </>;
}
