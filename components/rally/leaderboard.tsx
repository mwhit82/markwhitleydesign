"use client";
import { useEffect, useState } from 'react';
import { cars, formatTime } from './data';
import { boardKey, stageDefinition, weatherNames, type StageSelection } from './stages';
import styles from './rally.module.css';
export type RaceResult = {time:number;trace:number[][];run:Promise<string|null>};
type Entry = {rank:number;name:string;time:number;car:number;mine:boolean};
export function Leaderboard({selection,result,onClose}:{selection:StageSelection;result:RaceResult|null;onClose:()=>void}) {
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
  const query=new URLSearchParams({stage:selection.stage,weather:selection.weather,reverse:String(selection.reverse),...(filter?{car:filter}:{})}).toString();
  useEffect(()=>{
    const abort=new AbortController();
    setLoading(true); setError(''); setEntries([]); setMe(null); setMore(false);
    fetch(`/api/rally/leaderboard?${query}`,{signal:abort.signal}).then(async response=>{
      const data=await response.json(); if(!response.ok) throw new Error(data.error);
      setEntries(data.entries);setMe(data.me);setMore(data.more);
    }).catch(e=>{if(!abort.signal.aborted)setError(e.message || 'Could not load leaderboard.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[key,query,revision]);
  const showMore=async()=>{
    setLoading(true);setError('');
    try {
      const response=await fetch(`/api/rally/leaderboard?${query}&offset=${entries.length}`);
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setEntries(current=>[...current,...data.entries]);setMe(data.me);setMore(data.more);
    }catch(e){setError(e instanceof Error?e.message:'Could not load more times.');}finally{setLoading(false);}
  };
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault(); if(!result)return;
    setBusy(true);setMessage('');
    try {
      const run=await result.run;
      if(!run)throw new Error('This run was not connected to the leaderboard. Try a new run once it is available.');
      const response=await fetch('/api/rally/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,run,name:name.trim()})});
      const data=await response.json(); if(!response.ok)throw new Error(data.error);
      try{localStorage.setItem('rally-name',name.trim());}catch{}
      setSubmitted(true);setMessage('Time submitted. Your fastest run appears below.');setRevision(r=>r+1);
    }catch(e){setMessage(e instanceof Error?e.message:'Could not submit time.');}finally{setBusy(false);}
  };
  const row=(entry:Entry)=><><b>#{entry.rank}</b><span>{entry.name}{entry.mine?' · You':''}<small>{cars[entry.car]?.name || 'Rally car'}</small></span><strong>{formatTime(entry.time)}</strong></>;
  return <div className={styles.leaderboard} role="dialog" aria-modal="true" aria-label="Stage leaderboard" onKeyDown={e=>e.stopPropagation()}>
    <header><div><span className={styles.tag}>STAGE LEADERBOARD</span><h2>{stageDefinition(selection).name}</h2><p>{weatherNames[selection.weather]} · {selection.reverse?'Reverse':'Forward'}</p></div><button autoFocus onClick={onClose} aria-label="Close leaderboard">Close ×</button></header>
    {result && !submitted && (result.trace.length ? <form onSubmit={submit}><label>Driver name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={20} required placeholder="Your name" autoComplete="nickname" /></label><button disabled={busy||loading||Boolean(error)} type="submit">{busy?'Submitting…':`Submit ${formatTime(result.time)}`}</button><small>Public name · best time per driver on this browser. Clearing cookies or switching devices creates a new driver.</small></form>:<p>Practice finish: resets are allowed, but a ranked run must be completed without resetting.</p>)}
    {message&&<p role="status">{message}</p>}
    <label className={styles.boardFilter}>Show<select value={filter} onChange={e=>setFilter(e.target.value)} disabled={loading}><option value="">All cars</option>{cars.map((c,i)=><option value={i} key={c.name}>{c.name}</option>)}</select></label>
    {error&&<p role="status">{error} <button onClick={()=>setRevision(r=>r+1)}>Retry</button></p>}
    <div className={styles.boardRows} tabIndex={0} aria-label="Ranked times"><ol>{entries.map(entry=><li key={entry.rank} className={entry.mine?styles.myRow:''}>{row(entry)}</li>)}</ol>{!loading&&!error&&!entries.length&&<p>No times yet. Set the first one.</p>}{loading&&<p role="status">Loading times…</p>}{more&&<button disabled={loading} onClick={showMore}>Show 20 more</button>}</div>
    {me&&!entries.some(e=>e.mine)&&<div className={styles.myRank}><small>YOUR POSITION</small><div>{row(me)}</div></div>}
    {!me&&!loading&&!error&&<p>Complete and submit a run to see your position.</p>}
  </div>;
}
