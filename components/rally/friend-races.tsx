'use client';
import {stageVehicle,compatibleCar} from './stages';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {RallyWorld} from './world';
import type {RaceRoom,LivePose} from './room-types';
import {lapCount,isCircuit,boardKey,trackName,timeNames,timeOfDay,weatherNames,type StageSelection} from './stages';
import {cars,formatTime} from './data';
import styles from './rally.module.css';
import {HudIcon} from './ui';
import {SelectionCard} from './selection-card';
import {previewImage} from './preview-manifest';
import {stages,stageDefinition,stageTimes,trackNames} from './stages';
const rivalColors=['#68c4d0','#e6ad5c','#cfa1e2','#a8ce78'];
type Session={room:RaceRoom;id:string;token:string};
export function FriendRaces({openRequest,world,selection,car,ready,mode,onSetup,onActive}:{openRequest:number;world:()=>RallyWorld|null;selection:StageSelection;car:number;ready:boolean;mode:string;onSetup:(s:StageSelection,car:number)=>void;onActive:(active:boolean)=>void}){
 const [open,setOpen]=useState(false),[room,setRoom]=useState<RaceRoom|null>(null),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[liveMenu,setLiveMenu]=useState(false);
 const [picker,setPicker]=useState<'stage'|'track'|'weather'|'time'|'direction'|'laps'|null>(null);
 const [carOpen,setCarOpen]=useState(false);
 const [confirmLeave,setConfirmLeave]=useState(false);
 const [entryStep,setEntryStep]=useState<'choose'|'create'|'join'>('choose'),[setupOpen,setSetupOpen]=useState(false),[draft,setDraft]=useState(selection),[preparing,setPreparing]=useState(false),[inviteOpen,setInviteOpen]=useState(false);
 useEffect(()=>{if(openRequest)setOpen(true);},[openRequest]);
 const session=useRef<Session|null>(null),socket=useRef<WebSocket|null>(null),generation=useRef(0),attempt=useRef(-1),offset=useRef(0),lostAt=useRef(0),retry=useRef<ReturnType<typeof setTimeout>|null>(null),poses=useRef(new Map<string,LivePose>());
 const pendingFinish=useRef<Record<string,unknown>|null>(null);
 const [,refreshStandings]=useState(0),hasRoom=room!==null;
 const card=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(open||liveMenu)card.current?.querySelector<HTMLElement>('input,button')?.focus();},[open,liveMenu,confirmLeave]);
 useEffect(()=>{if(!hasRoom)return;const timer=setInterval(()=>refreshStandings(n=>n+1),1000);return()=>clearInterval(timer);},[hasRoom]);
 const callbacks=useRef({world,onSetup,onActive});callbacks.current={world,onSetup,onActive};
 const send=(payload:Record<string,unknown>)=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify({version:3,...payload}));};
 const leave=()=>{
  const departing=socket.current,id=session.current?.id;
  if(departing?.readyState===WebSocket.OPEN){
   // Keep the function alive until Redis confirms retirement; closing immediately can cancel the write.
   const close=()=>{clearTimeout(deadline);departing.removeEventListener('message',ack);departing.close();};
   const ack=(event:MessageEvent)=>{try{const m=JSON.parse(event.data);if(m.type==='room'){const seat=m.room.members.find((p:{id:string;status:string})=>p.id===id);if(!seat||seat.status==='retired')close();}}catch{}};
   const deadline=setTimeout(close,5000);departing.addEventListener('message',ack);send({type:'leave'});
  }else departing?.close();
  setPicker(null);setCarOpen(false);setConfirmLeave(false);setEntryStep('choose');setSetupOpen(false);setInviteOpen(false);generation.current++;if(retry.current)clearTimeout(retry.current);socket.current=null;session.current=null;pendingFinish.current=null;setRoom(null);setConnected(false);setLiveMenu(false);setOpen(false);attempt.current=-1;const w=callbacks.current.world();if(w){w.roomJoined=false;w.leaveLive();}callbacks.current.onActive(false);try{sessionStorage.removeItem('rally-room');}catch{}};
 const requestBack=useCallback(()=>{if(picker){setPicker(null);return;}if(carOpen){setCarOpen(false);return;}if(setupOpen){setSetupOpen(false);return;}if(confirmLeave){setConfirmLeave(false);return;}if(room?.phase==='lobby'||room?.phase==='results'){setConfirmLeave(true);return;}if(!room&&entryStep!=='choose'){setEntryStep('choose');return;}setOpen(false);setLiveMenu(false);},[picker,carOpen,setupOpen,confirmLeave,room,entryStep]);
 const connect=(entry:Session)=>{
  session.current=entry;const rev=++generation.current;setRoom(entry.room);setOpen(true);callbacks.current.onActive(true);const joined=callbacks.current.world();if(joined)joined.roomJoined=true;
  const boot=()=>{
   if(rev!==generation.current)return;
   const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rally/rooms/socket?code=${entry.room.code}`);socket.current=ws;
   ws.onopen=()=>{if(rev!==generation.current){ws.close();return;}ws.send(JSON.stringify({version:3,type:'hello',id:entry.id,token:entry.token}));};
   ws.onmessage=e=>{if(rev!==generation.current)return;let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='error'){setError(m.error);return;}
    if(m.type==='pose'){const p=m.pose as LivePose;if(p.id!==entry.id){poses.current.set(p.id,p);const w=callbacks.current.world();if(w&&w.live)w.rivals.receive(p,w.vehicle,rivalColors[Math.max(0,entry.room.members.findIndex(m=>m.id===p.id))]);}return;}
    if(m.type!=='room')return;setConnected(true);lostAt.current=0;setError('');offset.current=m.now-Date.now();const r=m.room as RaceRoom;if(r.version!==3){setError('Game updated. Refresh to join.');return;}const previousPhase=entry.room.phase;entry.room=r;setRoom(r);
    try{sessionStorage.setItem('rally-room',JSON.stringify(entry));}catch{}
    const w=callbacks.current.world();if(!w)return;
    const myCar=r.members.find(p=>p.id===entry.id)?.car??r.car;
    w.setRoomDrivers(r.members.filter(p=>p.id!==entry.id).map(p=>({id:p.id,car:p.car??r.car,color:rivalColors[r.members.indexOf(p)]})));
    if(r.phase==='lobby'){if(w.mode!=='garage')w.garage();if(boardKey(w.selection)!==boardKey(r.selection)||w.selected!==myCar)callbacks.current.onSetup(r.selection,myCar);if(previousPhase!=='lobby')setOpen(true);w.live=false;}
    if(r.phase==='racing'&&attempt.current!==r.attempt){attempt.current=r.attempt;pendingFinish.current=null;if(boardKey(w.selection)!==boardKey(r.selection)||w.selected!==myCar)callbacks.current.onSetup(r.selection,myCar);w.beginLive(r.startAt-offset.current);setOpen(false);setLiveMenu(false);}
    if(r.phase==='results'){setOpen(true);if(w.mode==='race'||w.mode==='countdown'){w.leaveLive();}}
    const seat=r.members.find(p=>p.id===entry.id);if(seat?.status==='finished')pendingFinish.current=null;else if(seat?.status==='racing'&&pendingFinish.current)send(pendingFinish.current);if(!seat||seat.status==='disconnected'){setError('Reconnect window expired. Leave and rejoin for the next race.');w.leaveLive();}
   };
   ws.onclose=()=>{if(rev!==generation.current)return;setConnected(false);lostAt.current ||=Date.now();if(Date.now()-lostAt.current<20000){setError('Reconnecting… your race clock continues.');retry.current=setTimeout(boot,1000);}else{setError('Connection lost. Leave the room to return to solo racing.');setOpen(true);callbacks.current.world()?.leaveLive();}};
   ws.onerror=()=>{setError('Live connection unavailable. Solo racing still works.');};
  };boot();
 };
 useEffect(()=>{const invite=new URLSearchParams(location.search).get('room');if(invite){setEntryStep('join');setCode(invite.toUpperCase().slice(0,6));setOpen(true);}try{const saved=localStorage.getItem('rally-room-name');if(saved&&saved!=='Driver')setName(saved);}catch{}const currentGeneration=generation;return()=>{currentGeneration.current++;if(retry.current)clearTimeout(retry.current);socket.current?.close();};},[]);
 useEffect(()=>{if(!ready)return;const w=callbacks.current.world();if(!w)return;w.onLiveMenu=setLiveMenu;w.onLivePose=(pose,recovered)=>{if(session.current)poses.current.set(session.current.id,{...pose,id:session.current.id,sent:Date.now()});send({type:'pose',pose,recovered});};w.onLiveFinish=(time,trace,practice)=>{pendingFinish.current={type:'finish',attempt:attempt.current,time,trace,practice};send(pendingFinish.current);};return()=>{w.onLiveMenu=null;w.onLivePose=null;w.onLiveFinish=null;};},[ready]);
 useEffect(()=>{const w=callbacks.current.world();if(w){w.roomMenuOpen=open||liveMenu;w.onRoomBack=requestBack;w.menuOpen=open||liveMenu;if(w.live)w.liveMenu=open||liveMenu;}},[open,liveMenu,ready,requestBack]);
 const enter=async(join:boolean)=>{setBusy(true);setError('');try{const response=await fetch('/api/rally/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:3,name,selection,car,...(join?{code}:{})})});const data=await response.json();if(!response.ok)throw Error(data.error||'Room unavailable');try{localStorage.setItem('rally-room-name',name);}catch{}connect(data);}catch(e){setError(e instanceof Error?e.message:'Could not join');}finally{setBusy(false);}};
 const me=room?.members.find(p=>p.id===session.current?.id),host=room?.host===session.current?.id;
 const readyUp=async()=>{if(me?.ready){send({type:'ready',ready:false});return;}setPreparing(true);try{if(await world()?.prepareRace())send({type:'ready',ready:true});}finally{setPreparing(false);}};
 const applySetup=()=>{send({type:'setup',selection:draft,car:stageVehicle(draft.stage)??(compatibleCar(draft,room?.car??0)?room!.car:0)});setSetupOpen(false);};
 return <>
  {room&&mode!=='garage'&&<button className={`${styles.friendsLaunch} ${styles.friendsInRace}`} onClick={()=>setOpen(true)}><HudIcon name="people"/> Friends</button>}
  {room&&!open&&<div className={styles.roomStandings}>{room.members.map((m,i)=><span key={m.id} style={{borderLeft:`3px solid ${rivalColors[i]}`,paddingLeft:6}}>{m.id===session.current?.id?'You':m.name} · {m.time!==undefined?formatTime(m.time):m.status==='racing'?`${Math.round((poses.current.get(m.id)?.progress??0)*100)}%`:m.status}</span>)}</div>}
  {(open||liveMenu)&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Race friends" data-rally-menu="true"><div ref={card} className={styles.roomCard} onKeyDown={e=>{if(e.key!=='Tab')return;const items=Array.from(card.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select')??[]).filter(el=>el.getClientRects().length);if(!items.length)return;e.preventDefault();const i=items.indexOf(document.activeElement as HTMLElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}}>
   {confirmLeave?<><h2>Leave lobby?</h2><p>{room?.members.length===1?'Nobody else has joined yet. Leaving will close your lobby.':'You will leave this room and return to solo setup.'}</p><button data-menu-default onClick={()=>setConfirmLeave(false)}>Stay</button><button onClick={leave}>Leave lobby</button></>:<>
   <button className={`${styles.tertiary} ${styles.roomBack}`} onClick={requestBack}><HudIcon name="left"/> Back</button><h2>Race friends</h2>
   {error&&<p role="status">{error}</p>}
   {!room?<>
    {entryStep==='choose'?<div className={styles.roomChoices}><button disabled={!ready} onClick={()=>setEntryStep('create')}><HudIcon name="people"/> Create race</button><button disabled={!ready} onClick={()=>setEntryStep('join')}><HudIcon name="invite"/> Join race</button></div>:<>
    <label>Your name<input placeholder="Driver" autoComplete="nickname" onFocus={e=>{if(name==='Driver')setName('');else e.currentTarget.select();}} maxLength={20} value={name} onChange={e=>setName(e.target.value)}/></label>
    {entryStep==='join'?<label>Friend’s code<input autoCapitalize="characters" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>:<p>{trackName(selection)} · {cars[car].name}</p>}
    <button disabled={busy||name.trim().length<2||(entryStep==='join'&&code.length!==6)} onClick={()=>enter(entryStep==='join')}>{busy?'Connecting…':entryStep==='join'?'Join race':'Create race'}</button></>}
   </>:<>
    <p>{trackName(room.selection)} · {weatherNames[room.selection.weather]} · {timeNames[timeOfDay(room.selection)]} · {room.selection.reverse?'Reverse':'Forward'}{isCircuit(room.selection)?` · ${lapCount(room.selection)} laps`:null}</p>
    <ol>{room.members.map(m=><li key={m.id}>{m.name} · {cars[m.car??room.car].name}{m.id===session.current?.id?' · You':''} — {m.time!==undefined?`${formatTime(m.time)}${m.practice?' · Practice':''}`:m.ready?'Ready':m.status==='lobby'?'Getting ready':m.status}</li>)}</ol>
    {room.phase==='lobby'&&<>
      <button className={styles.start} disabled={!connected||preparing} onClick={()=>void readyUp()}><HudIcon name="check"/>{preparing?'Preparing race…':me?.ready?'Ready ✓ — change':'Ready to race'}</button>
      {host&&room.members.length>=2&&room.members.every(p=>p.ready)&&<button className={styles.start} disabled={!connected} onClick={()=>send({type:'start'})}><HudIcon name="right"/> Start together</button>}
      <button onClick={async()=>{setInviteOpen(true);try{await navigator.clipboard.writeText(`${location.origin}/playground/rally?room=${room.code}`);setError('Invitation link copied.');}catch{setError('Copy the invitation link below.');}}}><HudIcon name="invite"/> Invite a friend</button>
      {inviteOpen&&<label>Invitation link<input readOnly value={`${typeof location==='undefined'?'':location.origin}/playground/rally?room=${room.code}`} onFocus={e=>e.currentTarget.select()}/><small>Room code: {room.code}</small></label>}
      <button disabled={!connected||preparing} onClick={()=>setCarOpen(true)}><HudIcon name="wheel"/> Your car · {cars[me?.car??room.car].name}</button>
      {host&&<button onClick={()=>{setDraft(room.selection);setSetupOpen(true);}}><HudIcon name="settings"/> Race setup</button>}

    </>}
    {room.phase==='results'&&host&&<button onClick={()=>send({type:'again'})}><HudIcon name="recover"/> Race again</button>}
    {room.phase==='results'&&!host&&<p>Waiting for the host to start a rematch.</p>}
    {room.phase==='racing'&&<><p>The race continues while this menu is open.</p><button onClick={()=>{setOpen(false);setLiveMenu(false);const w=world();if(w)w.liveMenu=false;}}>Resume driving</button></>}
    <button className={styles.tertiary} onClick={()=>setConfirmLeave(true)}><HudIcon name="left"/> Leave room</button>
   </>}
   </>}
  </div></div>}
 {setupOpen&&room&&host&&<div className={styles.optionScrim}><section className={styles.optionPanel} role="dialog" aria-modal="true" aria-label="Room race setup" data-rally-menu="true"><header><h2>Race setup</h2><button aria-label="Close room setup" onClick={()=>setSetupOpen(false)}>×</button></header><div className={styles.stageChoices}>
 {(['stage','track','weather','time','direction',...(isCircuit(draft)?['laps']:[])] as const).map(kind=><button key={kind} onClick={()=>setPicker(kind as NonNullable<typeof picker>)}><small>{{stage:'ENVIRONMENT',track:'TRACK',weather:'WEATHER',time:'TIME OF DAY',direction:'ROUTE',laps:'LAPS'}[kind]}</small><strong>{{stage:stageDefinition(draft).name,track:trackName(draft),weather:weatherNames[draft.weather],time:timeNames[timeOfDay(draft)],direction:draft.reverse?'Reverse':'Forward',laps:String(lapCount(draft))}[kind]}</strong><HudIcon name="next"/></button>)}
 </div><button className={styles.start} disabled={!connected} onClick={applySetup}>Apply setup <HudIcon name="check"/></button></section></div>}
 {picker&&<RoomSetupPicker kind={picker} selection={draft} onClose={()=>setPicker(null)} onSelect={s=>{setDraft(s);setPicker(null);}}/>}
 {carOpen&&room&&<div className={styles.optionScrim}><section className={styles.optionPanel} role="dialog" aria-modal="true" aria-label="Choose your car" data-rally-menu="true"><header><h2>Your car</h2><button aria-label="Close car selection" onClick={()=>setCarOpen(false)}>×</button></header><div className={styles.stageChoices}>{cars.map((c,i)=>compatibleCar(room.selection,i)&&<button key={i} aria-pressed={(me?.car??room.car)===i} onClick={()=>{send({type:'car',car:i});setCarOpen(false);}}><small>{c.year}</small><strong>{c.name}</strong><HudIcon name={(me?.car??room.car)===i?'check':'next'}/></button>)}</div></section></div>}
 </>;
}

function RoomSetupPicker({kind,selection:s,onSelect,onClose}:{kind:'stage'|'track'|'weather'|'time'|'direction'|'laps';selection:StageSelection;onSelect:(s:StageSelection)=>void;onClose:()=>void}){
 const options=kind==='stage'?stages.map(stage=>({value:stage.id,label:stage.name,detail:stage.surface,selected:s.stage===stage.id})):kind==='track'?trackNames[s.stage].map((label,i)=>({value:String(i+1),label,detail:'Track layout',selected:(s.track??1)===i+1})):kind==='weather'?stageDefinition(s).conditions.map(w=>({value:w,label:weatherNames[w],detail:'Weather conditions',selected:s.weather===w})):kind==='time'?stageTimes(s.stage).map(t=>({value:t,label:timeNames[t],detail:'Lighting',selected:timeOfDay(s)===t})):kind==='direction'?['forward','reverse'].map(v=>({value:v,label:v==='forward'?'Forward':'Reverse',detail:'Route direction',selected:s.reverse===(v==='reverse')})):[1,3,5].map(n=>({value:String(n),label:`${n} laps`,detail:'Race length',selected:lapCount(s)===n}));
 const select=(v:string)=>{if(kind==='stage'){const stage=v as StageSelection['stage'];onSelect({...s,stage,track:1,weather:'clear',timeOfDay:stage==='neon'?'night':'midday',laps:3,circuitVersion:2});}else if(kind==='track')onSelect({...s,track:Number(v) as 1|2|3});else if(kind==='weather')onSelect({...s,weather:v as StageSelection['weather']});else if(kind==='time')onSelect({...s,timeOfDay:v as StageSelection['timeOfDay']});else if(kind==='direction')onSelect({...s,reverse:v==='reverse'});else onSelect({...s,laps:Number(v) as 1|3|5});};
 const title={stage:'Choose stage',track:'Choose track',weather:'Choose weather',time:'Time of day',direction:'Route direction',laps:'Race length'}[kind];
 if(['stage','track','weather','time'].includes(kind))return <SelectionCard title={title} options={options.map(o=>({...o,image:previewImage(kind,o.value,s)}))} onSelect={select} onClose={onClose}/>;
 return <div className={styles.optionScrim}><section className={styles.optionPanel} role="dialog" aria-modal="true" aria-label={title} data-rally-menu="true"><header><h2>{title}</h2><button onClick={onClose} aria-label="Close options">×</button></header><div className={styles.optionList}>{options.map(o=><button key={o.value} aria-pressed={o.selected} onClick={()=>select(o.value)}>{o.label}<HudIcon name={o.selected?'check':'next'}/></button>)}</div></section></div>;
}
