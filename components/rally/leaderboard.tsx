"use client";
import { useEffect, useRef, useState } from 'react';
import { cars, formatTime } from './data';
import { isCircuit, lapCount, boardKey, trackName, weatherNames, timeOfDay, timeNames, type StageSelection } from './stages';
import styles from './rally.module.css';
import {reasonText, type Eligibility} from "./checkpoints";
import type { Replay } from "./replay";
import {BoardPeriodPicker,useBoardPeriod} from './board-period';
import {trackEvent,type TrackProperties} from '../../lib/pendo';
import {seconds,setupProperties} from './analytics';
export type RaceResult = Eligibility & {time:number;penalty?:number;trace:number[][];replay?:Replay;run:Promise<string|null>};
type Entry = {rank:number;name:string;time:number;car:number;mine:boolean};
type PendingSubmission = {revision:number;properties:TrackProperties};
/** Board period, car filter and conditions as Pendo properties, read from the request so effects keep their dependencies. */
function boardProperties(query:string){const q=new URLSearchParams(query),car=q.get('car');return {period:q.get('period')??undefined,carFilter:car===null?undefined:Number(car),carFilterName:car===null?undefined:cars[Number(car)]?.name,stage:q.get('stage')??undefined,track:Number(q.get('track')??1),weather:q.get('weather')??undefined,timeOfDay:q.get('timeOfDay')??undefined,reverse:q.get('reverse')==='true',laps:Number(q.get('laps')??1)};}
/** The view a player picks with the period toggle and car filter. */
const boardView=(query:string)=>{const {period,carFilter}=boardProperties(query);return `${period}:${carFilter??''}`;};
function loadFailed(query:string,errorMessage:string,httpStatus:number|undefined,isPagination:boolean){const {period,stage,carFilter}=boardProperties(query);trackEvent('rally_leaderboard_load_failed',{leaderboardType:'stage',errorMessage,httpStatus,period,isPagination,activeFilterCount:carFilter===undefined?0:1,stage,carFilter});}
/** Sends a successful submission once: from the first board load after it (with the player's rank), or on close. */
function reportSubmission(pending:{current:PendingSubmission|null},revision=Infinity,board:TrackProperties={}){const submission=pending.current;if(!submission||revision<submission.revision)return;pending.current=null;trackEvent('rally_leaderboard_time_submitted',{...submission.properties,...board});}
export function Leaderboard({selection,car,result,onClose}:{selection:StageSelection;car:number;result:RaceResult|null;onClose:()=>void}) {
  const {period,setPeriod,window,setWindow,rollover}=useBoardPeriod();
  const generation=useRef(0);
  const pendingSubmission=useRef<PendingSubmission|null>(null);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [me,setMe]=useState<Entry|null>(null);
  const [more,setMore]=useState(false);
  const [filter,setFilter]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [name,setName]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const [revision,setRevision]=useState(0);
  const key=boardKey(selection);
  useEffect(()=>{try {setName(localStorage.getItem('rally-name')||'');} catch {}},[]);
  const query=new URLSearchParams({period,stage:selection.stage,weather:selection.weather,reverse:String(selection.reverse),timeOfDay:timeOfDay(selection),track:String(selection.track??1),...(isCircuit(selection)?{laps:String(selection.laps??3),circuitVersion:'2'}:{}),...(filter?{car:filter}:{})}).toString();
  const loadedView=useRef(boardView(query));
  useEffect(()=>{
    const version=++generation.current;
    const abort=new AbortController();
    let status:number|undefined;
    setWindow(null);
    setLoading(true); setError(''); setEntries([]); setMe(null); setMore(false);
    fetch(`/api/rally/leaderboard?${query}`,{signal:abort.signal}).then(async response=>{
      status=response.status;
      const data=await response.json(); if(!response.ok) throw new Error(data.error);
      if(version!==generation.current)return;
      setEntries(data.entries);setMe(data.me);setMore(data.more);setWindow(data.window);
      reportSubmission(pendingSubmission,revision,{period:data.window?.period,playerRank:data.me?.rank,boardTotal:data.total});
      // Only a period or car filter change is reported, not the first load or automatic refreshes.
      const view=boardView(query);
      if(view!==loadedView.current){loadedView.current=view;trackEvent('rally_stage_leaderboard_filtered',()=>({...boardProperties(query),entriesCount:data.entries.length,total:data.total,playerRank:data.me?.rank,week:data.window?.week}));}
    }).catch(e=>{if(!abort.signal.aborted){const errorMessage=e.message || 'Could not load leaderboard.';setError(errorMessage);loadFailed(query,errorMessage,status,false);reportSubmission(pendingSubmission,revision);}}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>{abort.abort();generation.current=version+1;};
  },[key,query,revision,rollover,setWindow]);
  useEffect(()=>()=>reportSubmission(pendingSubmission),[]);
  const showMore=async()=>{
    if(loading)return;
    const version=generation.current;
    let status:number|undefined;
    setLoading(true);setError('');
    try {
      const response=await fetch(`/api/rally/leaderboard?${query}&offset=${entries.length}${period==='weekly'&&window?.week?`&week=${window.week}`:''}`);status=response.status;
      const data=await response.json();if(version!==generation.current)return;
      if(response.status===409){setRevision(r=>r+1);return;}
      if(!response.ok)throw new Error(data.error);
      setEntries(current=>[...current,...data.entries]);setMe(data.me);setMore(data.more);
    }catch(e){if(version===generation.current){const errorMessage=e instanceof Error?e.message:'Could not load more times.';setError(errorMessage);loadFailed(query,errorMessage,status,true);}}finally{if(version===generation.current)setLoading(false);}
  };
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault(); if(!result)return;
    setBusy(true);setMessage('');
    const details={time:seconds(result.time),penalty:seconds(result.penalty??0),...setupProperties(selection,car)};
    let run:string|null=null,status:number|undefined;
    try {
      run=await result.run;
      if(!run)throw new Error('This run was not connected to the leaderboard. Try a new run once it is available.');
      const response=await fetch('/api/rally/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,run,name:name.trim()})});status=response.status;
      const data=await response.json(); if(!response.ok)throw new Error(data.error);
      try{localStorage.setItem('rally-name',name.trim());}catch{}
      // Sent when the refreshed board returns the player's rank (see the load effect above).
      pendingSubmission.current={revision:revision+1,properties:{...details,hasReplay:Boolean(result.replay),traceSamples:result.trace.length,week:data.week}};
      setSubmitted(true);setMessage('Time submitted to the week your run started and to all time. Each board keeps your fastest run.');setRevision(r=>r+1);
    }catch(e){const errorMessage=e instanceof Error?e.message:'Could not submit time.';setMessage(errorMessage);trackEvent('rally_leaderboard_submit_failed',{...details,errorMessage,httpStatus:status,runConnected:Boolean(run)});}finally{setBusy(false);}
  };
  const row=(entry:Entry)=><><b>#{entry.rank}</b><span>{entry.name}{entry.mine?' · You':''}<small>{cars[entry.car]?.name || 'Rally car'}</small></span><strong>{formatTime(entry.time)}</strong></>;
  return <div className={styles.leaderboard} data-rally-menu="true" role="dialog" aria-modal="true" aria-label="Stage leaderboard" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
    <header><div><span className={styles.tag}>STAGE LEADERBOARD</span><h2>{trackName(selection)}</h2><p>{weatherNames[selection.weather]} · {timeNames[timeOfDay(selection)]} · {selection.reverse?'Reverse':'Forward'}{isCircuit(selection)?` · ${lapCount(selection)} laps`:''}</p></div><button autoFocus onClick={onClose} aria-label="Close leaderboard">Close ×</button></header>
    <BoardPeriodPicker period={period} onChange={setPeriod} window={window}/>
    {result && !submitted && (result.eligible && result.trace.length ? <form onSubmit={submit}><label>Driver name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={20} required placeholder="Your name" autoComplete="nickname" /></label><button disabled={busy||loading||Boolean(error)} type="submit">{busy?'Submitting…':`Submit ${formatTime(result.time)}`}</button><small>Public name · best time per driver on this browser. Clearing cookies or switching devices creates a new driver.</small></form>:<p>{result.reasons.map(r=>reasonText[r]).join(" · ")}. Practice time: {formatTime(result.time)}. Complete a clean run to rank.</p>)}
    {message&&<p role="status">{message}</p>}
    <label className={styles.boardFilter}>Show<select value={filter} onChange={e=>setFilter(e.target.value)} disabled={loading}><option value="">All cars</option>{cars.map((c,i)=>(selection.stage==='kart'?i===8:i<8)&&<option value={i} key={c.name}>{c.name}</option>)}</select></label>
    {error&&<p role="status">{error} <button onClick={()=>setRevision(r=>r+1)}>Retry</button></p>}
    <div className={styles.boardRows} tabIndex={0} aria-label="Ranked times"><ol>{entries.map(entry=><li key={entry.rank} className={entry.mine?styles.myRow:''}>{row(entry)}</li>)}</ol>{!loading&&!error&&!entries.length&&<p>{period==='weekly'?'No times this week yet. Set the first one.':'No all-time records yet. Set the first one.'}</p>}{loading&&<p role="status">Loading times…</p>}{more&&<button disabled={loading} onClick={showMore}>Show 20 more</button>}</div>
    {me&&!entries.some(e=>e.mine)&&<div className={styles.myRank}><small>YOUR POSITION</small><div>{row(me)}</div></div>}
    {!me&&!loading&&!error&&<p>Complete and submit a run to see your position.</p>}
  </div>;
}
