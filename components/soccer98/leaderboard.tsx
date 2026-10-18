'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './soccer98.module.css';
export type RankedResult = {run:string;trace:string;score:number};
type Table = {entries:{rank:number;name:string;score:number;mine:boolean}[];me:{rank:number;score:number}|null;total:number};
export function Leaderboard({result,onClose,onSaved}:{result:RankedResult|null;onClose:()=>void;onSaved:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [period,setPeriod] = useState('weekly');
  const [table,setTable] = useState<Table|null>(null);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [name,setName] = useState('');
  const [saving,setSaving] = useState(false);
  const [refresh,setRefresh] = useState(0);
  useEffect(()=>{dialog.current?.showModal();try{setName(localStorage.getItem('soccer98-name')||'');}catch{}},[]);
  useEffect(()=>{
    const controller = new AbortController();
    setTable(null);setError('');
    fetch(`/api/soccer98/leaderboard?period=${period}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setTable(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message||'Could not load the table.');});
    return ()=>controller.abort();
  },[period,refresh]);
  return <dialog ref={dialog} aria-labelledby="soccer-board-title" className={styles.leaderboard} onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}>
    <header><h2 id="soccer-board-title">SOCCER98 <span>LEADERBOARD</span></h2><button autoFocus onClick={onClose} aria-label="Close leaderboard">×</button></header>
    <div className={styles.boardTabs} aria-label="Leaderboard period">{['weekly','all-time'].map(value=><button key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{value==='weekly'?'THIS WEEK':'ALL TIME'}</button>)}</div>
    <p>{period==='weekly'?'Resets Monday, midnight UK time. Matches count towards the week they started.':'Your highest score, ever.'} Most balls wins. Your best match counts.</p>
    {result && <form onSubmit={async e=>{
      e.preventDefault();if(saving)return;setSaving(true);setNotice('');
      try{const response=await fetch('/api/soccer98/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,name:name.trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error);try{localStorage.setItem('soccer98-name',name.trim());}catch{}setNotice('Score submitted! Your best score counts in each table.');onSaved();setRefresh(n=>n+1);}catch(e){setNotice(e instanceof Error?e.message:'Could not save score.');}finally{setSaving(false);}
    }}><label htmlFor="soccer-player">Post your {result.score}-ball match</label><div><input id="soccer-player" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={20} required placeholder="Your display name" autoComplete="nickname"/><button disabled={saving}>{saving?'SAVING…':'POST SCORE'}</button></div><small>Your name will be public. Best score per browser; keep cookies to retain your place.</small></form>}
    {notice && <p role="status">{notice}</p>}
    {error ? <p role="alert">{error} <button onClick={()=>setRefresh(n=>n+1)}>Retry</button></p> : !table ? <p role="status">Loading scores…</p> : <>
      {table.me && <p className={styles.boardMe}>YOUR POSITION: #{table.me.rank} · {table.me.score} BALLS</p>}
      {table.entries.length ? <table><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Balls</th></tr></thead><tbody>{table.entries.map(entry=><tr key={entry.rank} className={entry.mine?styles.boardMe:undefined}><td>{entry.rank}</td><td>{entry.name}{entry.mine?' (you)':''}</td><td>{entry.score}</td></tr>)}</tbody></table> : <p>No scores yet. Set the first score!</p>}
      {table.total>50 && <p>Showing the top 50 of {table.total} players.</p>}
    </>}
  </dialog>;
}
