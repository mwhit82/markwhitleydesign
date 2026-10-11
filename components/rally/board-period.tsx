"use client";
import {useEffect,useState} from 'react';
import type {BoardPeriod,BoardWindow} from '../../lib/rally/period';
import styles from './rally.module.css';
export function useBoardPeriod(){
 const [period,setPeriod]=useState<BoardPeriod>('weekly');
 const [window,setWindow]=useState<BoardWindow|null>(null);
 const [rollover,setRollover]=useState(0);
 useEffect(()=>{
  if(period!=='weekly'||!window?.resetsAt)return;
  const reset=Date.parse(window.resetsAt);
  const refresh=()=>{if(Date.now()>=reset){setWindow(null);setRollover(n=>n+1);}};
  const timer=setTimeout(refresh,Math.max(0,reset-Date.now())+100);
  globalThis.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  return()=>{clearTimeout(timer);globalThis.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[period,window]);
 return {period,setPeriod,window,setWindow,rollover};
}
export function BoardPeriodPicker({period,onChange,window}:{period:BoardPeriod;onChange:(period:BoardPeriod)=>void;window:BoardWindow|null}){
 const week=window?.week;
 const date=week?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'}).format(new Date(`${week}T12:00:00Z`)):null;
 return <div className={styles.boardPeriod}>
  <div role="group" aria-label="Leaderboard period">
   <button aria-pressed={period==='weekly'} onClick={()=>onChange('weekly')}>This week</button>
   <button aria-pressed={period==='all-time'} onClick={()=>onChange('all-time')}>All time</button>
  </div>
  <small>{period==='weekly'?`${date?`Week of ${date} · `:''}Fresh board every Monday, 00:00 UK time.`:'Best-ever submitted times. These records never reset.'}</small>
 </div>;
}
