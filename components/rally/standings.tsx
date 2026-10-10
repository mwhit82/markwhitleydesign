"use client";
import {useEffect,useRef,useState} from 'react';
import {cars,formatTime} from './data';
import {stages,weatherNames,timeNames,timesOfDay,timeOfDay,stageDefinition,boardKey,type StageSelection,type Weather} from './stages';
import styles from './rally.module.css';
type Entry={rank:number;name:string;car:number;time:number;mine:boolean;selection:StageSelection};
export function Standings({onClose}:{onClose:()=>void}){
 const [filters,setFilters]=useState({stage:'',weather:'',reverse:'',timeOfDay:'',car:'',search:''});
 const [search,setSearch]=useState('');const [rows,setRows]=useState<Entry[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [busy,setBusy]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);const generation=useRef(0);const pending=useRef<AbortController|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>setSearch(filters.search.trim()),300);return()=>clearTimeout(timer);},[filters.search]);
 const query=new URLSearchParams(Object.entries({...filters,search}).filter(([,v])=>v!=='')).toString();
 useEffect(()=>{
  const version=++generation.current;pending.current?.abort();const abort=new AbortController();pending.current=abort;setRows([]);setCursor(null);setBusy(true);setError('');
  fetch(`/api/rally/standings?${query}`,{signal:abort.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);if(version===generation.current){setRows(data.entries);setCursor(data.cursor);}}).catch(e=>{if(!abort.signal.aborted)setError(e.message||'Could not load times.');}).finally(()=>{if(version===generation.current)setBusy(false);});
  return()=>{abort.abort();generation.current=version+1;};
 },[query,revision]);
 const more=async()=>{
  if(!cursor||busy)return;const version=generation.current;const abort=new AbortController();pending.current?.abort();pending.current=abort;setBusy(true);setError('');
  try{const response=await fetch(`/api/rally/standings?${query}&cursor=${encodeURIComponent(cursor)}`,{signal:abort.signal});const data=await response.json();if(!response.ok)throw Error(data.error);if(version===generation.current){setRows(previous=>[...previous,...data.entries]);setCursor(data.cursor);}}
  catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not load times.');}finally{if(version===generation.current)setBusy(false);}
 };
 const change=(key:keyof typeof filters,value:string)=>setFilters(f=>({...f,[key]:value,...(key==='stage'?{weather:''}:{})}));
 const conditions=filters.stage?stages.find(s=>s.id===filters.stage)!.conditions:Object.keys(weatherNames) as Weather[];
 return <div className={styles.leaderboard} data-rally-menu="true" role="dialog" aria-modal="true" aria-label="All rally leaderboards" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
  <header><div><span className={styles.tag}>THE RALLY REGISTER</span><h2>Leaderboards</h2><p>Browse every stage. Find your friends.</p></div><button onClick={onClose} aria-label="Close leaderboards">Close ×</button></header>
  <div className={styles.boardFilters}>
   <label>Find a driver<input type="search" maxLength={20} placeholder="Player name…" value={filters.search} onChange={e=>change('search',e.target.value)}/></label>
   <label>Track<select value={filters.stage} onChange={e=>change('stage',e.target.value)}><option value="">All tracks</option>{stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Direction<select value={filters.reverse} onChange={e=>change('reverse',e.target.value)}><option value="">Both directions</option><option value="false">Forward</option><option value="true">Reverse</option></select></label>
   <label>Weather<select value={filters.weather} onChange={e=>change('weather',e.target.value)}><option value="">All weather</option>{conditions.map(w=><option key={w} value={w}>{weatherNames[w]}</option>)}</select></label>
   <label>Time of day<select value={filters.timeOfDay} onChange={e=>change('timeOfDay',e.target.value)}><option value="">Any time</option>{timesOfDay.map(t=><option key={t} value={t}>{timeNames[t]}</option>)}</select></label>
   <label>Car<select value={filters.car} onChange={e=>change('car',e.target.value)}><option value="">All cars</option>{cars.map((c,i)=><option key={c.name} value={i}>{c.name}</option>)}</select></label>
  </div>
  <small>Grouped by track and conditions. Each # rank is within that configuration{filters.car!==''?' and car':''} — not an overall ranking.</small>
  {error&&<p role="alert">{error} <button onClick={()=>setRevision(r=>r+1)}>Retry</button></p>}
  <div className={styles.boardRows} tabIndex={0} aria-label="Times grouped by stage conditions"><ol>{rows.map((e,i)=><li key={`${boardKey(e.selection)}-${e.rank}-${i}`} className={e.mine?styles.myRow:''}><b>#{e.rank}</b><span>{e.name}{e.mine?' · You':''}<small>{stageDefinition(e.selection).name} · {e.selection.reverse?'Reverse':'Forward'} · {weatherNames[e.selection.weather]} · {timeNames[timeOfDay(e.selection)]}</small><small>{cars[e.car]?.name}</small></span><strong>{formatTime(e.time)}</strong></li>)}</ol>{busy&&<p role="status">Finding times…</p>}{!busy&&!error&&!rows.length&&<p>{cursor?'More records to search. Continue below.':'No matching times yet.'}</p>}{cursor&&<button disabled={busy} onClick={more}>{rows.length?'Show more':'Continue search'}</button>}</div>
 </div>;
}
