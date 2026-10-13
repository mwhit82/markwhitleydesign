'use client';
import {useEffect,useRef,useState} from 'react';
import type {RallyWorld} from './world';
import type {RaceRoom,LivePose} from './room-types';
import {lapCount,isCircuit,boardKey,trackName,timeNames,timeOfDay,weatherNames,type StageSelection} from './stages';
import {cars,formatTime} from './data';
import styles from './rally.module.css';
import {HudIcon} from './ui';
import {stages,stageDefinition,stageTimes,trackNames} from './stages';
const rivalColors=['#68c4d0','#e6ad5c','#cfa1e2','#a8ce78'];
type Session={room:RaceRoom;id:string;token:string};
export function FriendRaces({openRequest,world,selection,car,ready,mode,onSetup,onActive}:{openRequest:number;world:()=>RallyWorld|null;selection:StageSelection;car:number;ready:boolean;mode:string;onSetup:(s:StageSelection,car:number)=>void;onActive:(active:boolean)=>void}){
 const [open,setOpen]=useState(false),[room,setRoom]=useState<RaceRoom|null>(null),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[liveMenu,setLiveMenu]=useState(false);
 const [entryStep,setEntryStep]=useState<'choose'|'create'|'join'>('choose'),[setupOpen,setSetupOpen]=useState(false),[draft,setDraft]=useState(selection),[draftCar,setDraftCar]=useState(car),[preparing,setPreparing]=useState(false),[inviteOpen,setInviteOpen]=useState(false);
 useEffect(()=>{if(openRequest)setOpen(true);},[openRequest]);
 const session=useRef<Session|null>(null),socket=useRef<WebSocket|null>(null),generation=useRef(0),attempt=useRef(-1),offset=useRef(0),lostAt=useRef(0),retry=useRef<ReturnType<typeof setTimeout>|null>(null),poses=useRef(new Map<string,LivePose>());
 const pendingFinish=useRef<Record<string,unknown>|null>(null);
 const [,refreshStandings]=useState(0),hasRoom=room!==null;
 const card=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(open||liveMenu)card.current?.querySelector<HTMLElement>('input,button')?.focus();},[open,liveMenu]);
 useEffect(()=>{if(!hasRoom)return;const timer=setInterval(()=>refreshStandings(n=>n+1),1000);return()=>clearInterval(timer);},[hasRoom]);
 const callbacks=useRef({world,onSetup,onActive});callbacks.current={world,onSetup,onActive};
 const send=(payload:Record<string,unknown>)=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify({version:1,...payload}));};
 const leave=()=>{
  const departing=socket.current,id=session.current?.id;
  if(departing?.readyState===WebSocket.OPEN){
   // Keep the function alive until Redis confirms retirement; closing immediately can cancel the write.
   const close=()=>{clearTimeout(deadline);departing.removeEventListener('message',ack);departing.close();};
   const ack=(event:MessageEvent)=>{try{const m=JSON.parse(event.data);if(m.type==='room'){const seat=m.room.members.find((p:{id:string;status:string})=>p.id===id);if(!seat||seat.status==='retired')close();}}catch{}};
   const deadline=setTimeout(close,5000);departing.addEventListener('message',ack);send({type:'leave'});
  }else departing?.close();
  generation.current++;if(retry.current)clearTimeout(retry.current);socket.current=null;session.current=null;pendingFinish.current=null;setRoom(null);setConnected(false);setLiveMenu(false);setOpen(false);attempt.current=-1;const w=callbacks.current.world();if(w){w.roomJoined=false;w.leaveLive();}callbacks.current.onActive(false);try{sessionStorage.removeItem('rally-room');}catch{}};
 const connect=(entry:Session)=>{
  session.current=entry;const rev=++generation.current;setRoom(entry.room);setOpen(true);callbacks.current.onActive(true);const joined=callbacks.current.world();if(joined)joined.roomJoined=true;
  const boot=()=>{
   if(rev!==generation.current)return;
   const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rally/rooms/socket?code=${entry.room.code}`);socket.current=ws;
   ws.onopen=()=>{if(rev!==generation.current){ws.close();return;}ws.send(JSON.stringify({version:1,type:'hello',id:entry.id,token:entry.token}));};
   ws.onmessage=e=>{if(rev!==generation.current)return;let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='error'){setError(m.error);return;}
    if(m.type==='pose'){const p=m.pose as LivePose;if(p.id!==entry.id){poses.current.set(p.id,p);const w=callbacks.current.world();if(w&&w.live)w.rivals.receive(p,w.vehicle,rivalColors[Math.max(0,entry.room.members.findIndex(m=>m.id===p.id))]);}return;}
    if(m.type!=='room')return;setConnected(true);lostAt.current=0;setError('');offset.current=m.now-Date.now();const r=m.room as RaceRoom;if(r.version!==1){setError('Game updated. Refresh to join.');return;}const previousPhase=entry.room.phase;entry.room=r;setRoom(r);
    try{sessionStorage.setItem('rally-room',JSON.stringify(entry));}catch{}
    const w=callbacks.current.world();if(!w)return;
    if(r.phase==='lobby'){if(w.mode!=='garage')w.garage();if(r.host!==entry.id&&(boardKey(w.selection)!==boardKey(r.selection)||w.selected!==r.car))callbacks.current.onSetup(r.selection,r.car);if(previousPhase!=='lobby')setOpen(true);w.live=false;}
    if(r.phase==='racing'&&attempt.current!==r.attempt){attempt.current=r.attempt;pendingFinish.current=null;callbacks.current.onSetup(r.selection,r.car);w.beginLive(r.startAt-offset.current);setOpen(false);setLiveMenu(false);}
    if(r.phase==='results'){setOpen(true);if(w.mode==='race'||w.mode==='countdown'){w.leaveLive();}}
    const seat=r.members.find(p=>p.id===entry.id);if(seat?.status==='finished')pendingFinish.current=null;else if(seat?.status==='racing'&&pendingFinish.current)send(pendingFinish.current);if(!seat||seat.status==='disconnected'){setError('Reconnect window expired. Leave and rejoin for the next race.');w.leaveLive();}
   };
   ws.onclose=()=>{if(rev!==generation.current)return;setConnected(false);lostAt.current ||=Date.now();if(Date.now()-lostAt.current<20000){setError('Reconnecting… your race clock continues.');retry.current=setTimeout(boot,1000);}else{setError('Connection lost. Leave the room to return to solo racing.');setOpen(true);callbacks.current.world()?.leaveLive();}};
   ws.onerror=()=>{setError('Live connection unavailable. Solo racing still works.');};
  };boot();
 };
 useEffect(()=>{const invite=new URLSearchParams(location.search).get('room');if(invite){setEntryStep('join');setCode(invite.toUpperCase().slice(0,6));setOpen(true);}try{const saved=localStorage.getItem('rally-room-name');if(saved&&saved!=='Driver')setName(saved);}catch{}const currentGeneration=generation;return()=>{currentGeneration.current++;if(retry.current)clearTimeout(retry.current);socket.current?.close();};},[]);
 useEffect(()=>{if(!ready)return;const w=callbacks.current.world();if(!w)return;w.onLiveMenu=setLiveMenu;w.onLivePose=(pose,recovered)=>{if(session.current)poses.current.set(session.current.id,{...pose,id:session.current.id,sent:Date.now()});send({type:'pose',pose,recovered});};w.onLiveFinish=(time,trace,practice)=>{pendingFinish.current={type:'finish',attempt:attempt.current,time,trace,practice};send(pendingFinish.current);};return()=>{w.onLiveMenu=null;w.onLivePose=null;w.onLiveFinish=null;};},[ready]);
 useEffect(()=>{const w=callbacks.current.world();if(w){w.roomMenuOpen=open||liveMenu;w.onRoomBack=()=>{setOpen(false);setLiveMenu(false);};w.menuOpen=open||liveMenu;if(w.live)w.liveMenu=open||liveMenu;}},[open,liveMenu,ready]);
 const enter=async(join:boolean)=>{setBusy(true);setError('');try{const response=await fetch('/api/rally/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,selection,car,...(join?{code}:{})})});const data=await response.json();if(!response.ok)throw Error(data.error||'Room unavailable');try{localStorage.setItem('rally-room-name',name);}catch{}connect(data);}catch(e){setError(e instanceof Error?e.message:'Could not join');}finally{setBusy(false);}};
 const me=room?.members.find(p=>p.id===session.current?.id),host=room?.host===session.current?.id;
 const readyUp=async()=>{if(me?.ready){send({type:'ready',ready:false});return;}setPreparing(true);try{if(await world()?.prepareRace())send({type:'ready',ready:true});}finally{setPreparing(false);}};
 const applySetup=()=>{onSetup(draft,draftCar);send({type:'setup',selection:draft,car:draftCar});setSetupOpen(false);};
 return <>
  {room&&mode!=='garage'&&<button className={`${styles.friendsLaunch} ${styles.friendsInRace}`} onClick={()=>setOpen(true)}><HudIcon name="people"/> Friends</button>}
  {room&&!open&&<div className={styles.roomStandings}>{room.members.map((m,i)=><span key={m.id} style={{borderLeft:`3px solid ${rivalColors[i]}`,paddingLeft:6}}>{m.id===session.current?.id?'You':m.name} · {m.time!==undefined?formatTime(m.time):m.status==='racing'?`${Math.round((poses.current.get(m.id)?.progress??0)*100)}%`:m.status}</span>)}</div>}
  {(open||liveMenu)&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Race friends" data-rally-menu="true"><div ref={card} className={styles.roomCard} onKeyDown={e=>{if(e.key!=='Tab')return;const items=Array.from(card.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select')??[]).filter(el=>el.getClientRects().length);if(!items.length)return;e.preventDefault();const i=items.indexOf(document.activeElement as HTMLElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}}>
   <button className={styles.tertiary} onClick={()=>{if(!room&&entryStep!=='choose')setEntryStep('choose');else{setOpen(false);setLiveMenu(false);}}}><HudIcon name="left"/> Back</button><h2>Race friends</h2>
   {error&&<p role="status">{error}</p>}
   {!room?<>
    {entryStep==='choose'?<div className={styles.roomChoices}><button disabled={!ready} onClick={()=>setEntryStep('create')}><HudIcon name="people"/> Create race</button><button disabled={!ready} onClick={()=>setEntryStep('join')}><HudIcon name="invite"/> Join race</button></div>:<>
    <label>Your name<input placeholder="Driver" autoComplete="nickname" onFocus={e=>{if(name==='Driver')setName('');else e.currentTarget.select();}} maxLength={20} value={name} onChange={e=>setName(e.target.value)}/></label>
    {entryStep==='join'?<label>Friend’s code<input autoCapitalize="characters" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>:<p>{trackName(selection)} · {cars[car].name}</p>}
    <button disabled={busy||name.trim().length<2||(entryStep==='join'&&code.length!==6)} onClick={()=>enter(entryStep==='join')}>{busy?'Connecting…':entryStep==='join'?'Join race':'Create race'}</button></>}
   </>:<>
    <p>{trackName(room.selection)} · {cars[room.car].name} · {weatherNames[room.selection.weather]} · {timeNames[timeOfDay(room.selection)]} · {room.selection.reverse?'Reverse':'Forward'}{isCircuit(room.selection)?` · ${lapCount(room.selection)} laps`:null}</p>
    <ol>{room.members.map(m=><li key={m.id}>{m.name}{m.id===session.current?.id?' · You':''} — {m.time!==undefined?`${formatTime(m.time)}${m.practice?' · Practice':''}`:m.ready?'Ready':m.status==='lobby'?'Getting ready':m.status}</li>)}</ol>
    {room.phase==='lobby'&&<>
      <button disabled={!connected||preparing} onClick={()=>void readyUp()}><HudIcon name="check"/>{preparing?'Preparing race…':me?.ready?'Ready ✓ — change':'Ready to race'}</button>
      {host&&room.members.length>=2&&room.members.every(p=>p.ready)&&<button disabled={!connected} onClick={()=>send({type:'start'})}><HudIcon name="right"/> Start together</button>}
      <button onClick={()=>setInviteOpen(!inviteOpen)}><HudIcon name="invite"/> Invite a friend</button>
      {inviteOpen&&<><strong>{room.code}</strong><button onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/playground/rally?room=${room.code}`);setError('Invite copied.');}catch{setError(`Share code ${room.code}`);}}}>Copy invitation</button></>}
      {host&&<button onClick={()=>{setDraft(room.selection);setDraftCar(room.car);setSetupOpen(!setupOpen);}}><HudIcon name="settings"/> Setup</button>}
      {host&&setupOpen&&<div className={styles.roomSetup}>
       <label>Environment<select value={draft.stage} onChange={e=>{const stage=stages.find(s=>s.id===e.target.value)!;setDraft({...draft,stage:stage.id,track:1,weather:'clear',laps:['kart','nyc'].includes(stage.id)?3:undefined,circuitVersion:['kart','nyc'].includes(stage.id)?2:undefined});setDraftCar(stage.id==='kart'?8:0);}}>{stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
       <label>Track<select value={draft.track??1} onChange={e=>setDraft({...draft,track:Number(e.target.value) as 1|2|3})}>{trackNames[draft.stage].map((n,i)=><option key={n} value={i+1}>{n}</option>)}</select></label>
       <label>Car<select value={draftCar} onChange={e=>setDraftCar(Number(e.target.value))}>{cars.map((c,i)=>(draft.stage==='kart'?i===8:i<8)&&<option key={i} value={i}>{c.name}</option>)}</select></label>
       <label>Weather<select value={draft.weather} onChange={e=>setDraft({...draft,weather:e.target.value as StageSelection['weather']})}>{stageDefinition(draft).conditions.map(w=><option key={w} value={w}>{weatherNames[w]}</option>)}</select></label>
       <label>Time<select value={timeOfDay(draft)} onChange={e=>setDraft({...draft,timeOfDay:e.target.value as StageSelection['timeOfDay']})}>{stageTimes(draft.stage).map(t=><option key={t} value={t}>{timeNames[t]}</option>)}</select></label>
       <button onClick={()=>setDraft({...draft,reverse:!draft.reverse})}>Direction: {draft.reverse?'Reverse':'Forward'}</button>
       {isCircuit(draft)&&<label>Laps<select value={lapCount(draft)} onChange={e=>setDraft({...draft,laps:Number(e.target.value) as 1|3|5})}>{[1,3,5].map(n=><option key={n}>{n}</option>)}</select></label>}
       <button disabled={!connected} onClick={applySetup}>Apply setup</button></div>}
    </>}
    {room.phase==='results'&&host&&<button onClick={()=>send({type:'again'})}><HudIcon name="recover"/> Race again</button>}
    {room.phase==='results'&&!host&&<p>Waiting for the host to start a rematch.</p>}
    {room.phase==='racing'&&<><p>The race continues while this menu is open.</p><button onClick={()=>{setOpen(false);setLiveMenu(false);const w=world();if(w)w.liveMenu=false;}}>Resume driving</button></>}
    <button className={styles.tertiary} onClick={leave}><HudIcon name="left"/> Leave room</button>
   </>}
  </div></div>}
 </>;
}
