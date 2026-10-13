"use client";
import {useEffect,useRef,useState} from 'react';
import {cars,formatTime} from './data';
import {isCircuit,lapCount,stages,trackNames,stageTimes,weatherNames,timeNames,timesOfDay,timeOfDay,trackName,boardKey,type StageSelection,type Weather} from './stages';
import styles from './rally.module.css';
import {BoardPeriodPicker,useBoardPeriod} from './board-period';
import {trackEvent} from '../../lib/pendo';
type Entry={rank:number;name:string;car:number;time:number;mine:boolean;selection:StageSelection};
/** Search filters as Pendo properties, read from the request so effects keep their dependencies. Driver names are sent as a length only. */
function searchProperties(query:string){const q=new URLSearchParams(query),number=(key:string)=>q.has(key)?Number(q.get(key)):undefined;return {searchLength:q.get('search')?.length??0,stage:q.get('stage')??undefined,track:number('track'),weather:q.get('weather')??undefined,reverse:q.has('reverse')?q.get('reverse')==='true':undefined,timeOfDay:q.get('timeOfDay')??undefined,laps:number('laps'),car:number('car'),period:q.get('period')??undefined,activeFilterCount:[...q.keys()].filter(k=>k!=='search'&&k!=='period').length};}
function loadFailed(query:string,errorMessage:string,httpStatus:number|undefined,isPagination:boolean){const {period,activeFilterCount,stage,car}=searchProperties(query);trackEvent('rally_leaderboard_load_failed',{leaderboardType:'standings',errorMessage,httpStatus,period,isPagination,activeFilterCount,stage,carFilter:car});}
export function Standings({onClose}:{onClose:()=>void}){
 const {period,setPeriod,window,setWindow,rollover}=useBoardPeriod();
 const [showFilters,setShowFilters]=useState(false);
 const [filters,setFilters]=useState({laps:'',track:'',stage:'',weather:'',reverse:'',timeOfDay:'',car:'',search:''});
 const [mine,setMine]=useState<Entry[]>([]);
 const [search,setSearch]=useState('');const [rows,setRows]=useState<Entry[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [busy,setBusy]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);const generation=useRef(0);const pending=useRef<AbortController|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>setSearch(filters.search.trim()),300);return()=>clearTimeout(timer);},[filters.search]);
 const query=new URLSearchParams(Object.entries({...filters,search,period}).filter(([,v])=>v!=='')).toString();
 const searchedQuery=useRef(query);
 useEffect(()=>{
  const version=++generation.current;pending.current?.abort();const abort=new AbortController();pending.current=abort;setWindow(null);setRows([]);setMine([]);setCursor(null);setBusy(true);setError('');let status:number|undefined;
  fetch(`/api/rally/standings?${query}`,{signal:abort.signal}).then(async response=>{status=response.status;const data=await response.json();if(!response.ok)throw Error(data.error);if(version===generation.current){setWindow(data.window);setRows(data.entries);setMine(data.me??[]);setCursor(data.cursor);
   // Report each new search or filter once it returns results; skips the initial default board, retries and weekly rollovers.
   if(query!==searchedQuery.current){searchedQuery.current=query;trackEvent('rally_leaderboards_searched',()=>({...searchProperties(query),resultsCount:data.entries.length,myResultsCount:(data.me??[]).length,hasMore:Boolean(data.cursor)}));}}}).catch(e=>{if(!abort.signal.aborted){const errorMessage=e.message||'Could not load times.';setError(errorMessage);loadFailed(query,errorMessage,status,false);}}).finally(()=>{if(version===generation.current)setBusy(false);});
  return()=>{abort.abort();generation.current=version+1;};
 },[query,revision,rollover,setWindow]);
 const more=async()=>{
  if(!cursor||busy)return;const version=generation.current;const abort=new AbortController();pending.current?.abort();pending.current=abort;setBusy(true);setError('');let status:number|undefined;
  try{const response=await fetch(`/api/rally/standings?${query}&cursor=${encodeURIComponent(cursor)}${period==='weekly'&&window?.week?`&week=${window.week}`:''}`,{signal:abort.signal});status=response.status;const data=await response.json();if(version!==generation.current)return;if(response.status===409){setRevision(n=>n+1);return;}if(!response.ok)throw Error(data.error);if(version===generation.current){setRows(previous=>[...previous,...data.entries]);setCursor(data.cursor);}}
  catch(e){if(!abort.signal.aborted){const errorMessage=e instanceof Error?e.message:'Could not load times.';setError(errorMessage);loadFailed(query,errorMessage,status,true);}}finally{if(version===generation.current)setBusy(false);}
 };
 const change=(key:keyof typeof filters,value:string)=>setFilters(f=>({...f,[key]:value,...(key==='stage'?{weather:'',timeOfDay:'',car:''}:{})}));
 const conditions=filters.stage?stages.find(s=>s.id===filters.stage)!.conditions:Object.keys(weatherNames) as Weather[];
 return <div className={styles.leaderboard} data-rally-menu="true" role="dialog" aria-modal="true" aria-label="All rally leaderboards" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
  <header><div><span className={styles.tag}>THE RALLY REGISTER</span><h2>Leaderboards</h2><p>Browse every stage. Find your friends.</p></div><button onClick={onClose} aria-label="Close leaderboards">Close ×</button></header>
  <BoardPeriodPicker period={period} onChange={setPeriod} window={window}/>
  <div className={styles.filterBar}>
   <label>Find a driver<input type="search" maxLength={20} placeholder="Player name…" value={filters.search} onChange={e=>change('search',e.target.value)}/></label>
   <button aria-expanded={showFilters} aria-controls="rally-filters" onClick={()=>setShowFilters(v=>!v)}>{showFilters?'Hide filters':'Filters'}{Object.entries(filters).filter(([k,v])=>k!=='search'&&v).length?` (${Object.entries(filters).filter(([k,v])=>k!=='search'&&v).length})`:''}</button>
   <button onClick={()=>setFilters({laps:'',stage:'',weather:'',reverse:'',timeOfDay:'',car:'',track:'',search:''})}>Clear filters</button>
  </div>
  <small className={styles.filterSummary}>{[filters.stage&&stages.find(s=>s.id===filters.stage)?.name,filters.track&&`Track ${filters.track}`,filters.weather&&weatherNames[filters.weather as Weather],filters.reverse&&(filters.reverse==='true'?'Reverse':'Forward'),filters.timeOfDay&&timeNames[filters.timeOfDay as keyof typeof timeNames],filters.car&&cars[Number(filters.car)]?.name].filter(Boolean).join(' · ')||'All tracks, conditions and cars'}</small>
  {showFilters&&<div id="rally-filters" className={styles.boardFilters}>
   <label>Environment<select value={filters.stage} onChange={e=>change('stage',e.target.value)}><option value="">All environments</option>{stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Track<select value={filters.track} onChange={e=>change('track',e.target.value)}><option value="">All layouts</option>{(filters.stage==='nyc'?[1]:[1,2,3]).map(n=><option key={n} value={n}>{filters.stage?trackNames[filters.stage as keyof typeof trackNames][n-1]:`Track ${n}`}</option>)}</select></label>
   <label>Direction<select value={filters.reverse} onChange={e=>change('reverse',e.target.value)}><option value="">Both directions</option><option value="false">Forward</option><option value="true">Reverse</option></select></label>
   <label>Weather<select value={filters.weather} onChange={e=>change('weather',e.target.value)}><option value="">All weather</option>{conditions.map(w=><option key={w} value={w}>{weatherNames[w]}</option>)}</select></label>
   <label>Time of day<select value={filters.timeOfDay} onChange={e=>change('timeOfDay',e.target.value)}><option value="">Any time</option>{(filters.stage?stageTimes(filters.stage as keyof typeof trackNames):timesOfDay).map(t=><option key={t} value={t}>{timeNames[t]}</option>)}</select></label>
   <label>Race laps<select value={filters.laps} onChange={e=>change('laps',e.target.value)}><option value="">All race lengths</option>{[1,3,5].map(n=><option key={n} value={n}>{n} laps</option>)}</select></label>
   <label>Car<select value={filters.car} onChange={e=>change('car',e.target.value)}><option value="">All cars</option>{cars.map((c,i)=>(!filters.stage||(filters.stage==='kart'?i===8:i<8))&&<option key={c.name} value={i}>{c.name}</option>)}</select></label>
  </div>}
  <small>Matching runs ordered by total time. Different tracks and lap counts have different lengths — filter to compare like-for-like.</small>
  {mine.filter(e=>!rows.some(r=>r.mine&&r.rank===e.rank)).length>0&&<div className={styles.personalRanks}><strong>Your other matching results</strong>{mine.filter(e=>!rows.some(r=>r.mine&&r.rank===e.rank)).map(e=><p key={e.rank}>#{e.rank} · {e.name} · {trackName(e.selection)} · {e.selection.reverse?'Reverse':'Forward'} · {weatherNames[e.selection.weather]} · {timeNames[timeOfDay(e.selection)]} · {cars[e.car]?.name}{isCircuit(e.selection)?` · ${lapCount(e.selection)} laps`:''} · {formatTime(e.time)}</p>)}</div>}
  {error&&<p role="alert">{error} <button onClick={()=>setRevision(r=>r+1)}>Retry</button></p>}
  <div className={styles.boardRows} tabIndex={0} aria-label="Matching times, fastest first"><ol>{rows.map((e,i)=><li key={`${boardKey(e.selection)}-${e.rank}-${i}`} className={e.mine?styles.myRow:''}><b>#{e.rank}</b><span>{e.name}{e.mine?' · You':''}<small>{trackName(e.selection)} · {e.selection.reverse?'Reverse':'Forward'} · {weatherNames[e.selection.weather]} · {timeNames[timeOfDay(e.selection)]}</small><small>{cars[e.car]?.name}{isCircuit(e.selection)?` · ${lapCount(e.selection)} laps`:''}</small></span><strong>{formatTime(e.time)}</strong></li>)}</ol>{busy&&<p role="status">Finding times…</p>}{!busy&&!error&&!rows.length&&<p>{cursor?'More records to search. Continue below.':period==='weekly'?'No matching times this week. Be the first!':'No matching all-time records yet.'}</p>}{cursor&&<button disabled={busy} onClick={more}>{rows.length?'Show more':'Continue search'}</button>}</div>
 </div>;
}
