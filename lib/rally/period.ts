export type BoardPeriod = 'weekly' | 'all-time';
export type BoardWindow = {period:BoardPeriod;week:string|null;resetsAt:string|null};
const londonDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
const londonHour=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'});
/** Weeks are keyed by their Monday date in London, independent of server timezone. */
export function boardWindow(period:BoardPeriod='weekly',now=new Date()):BoardWindow {
 if(period==='all-time')return {period,week:null,resetsAt:null};
 const parts=londonDate.formatToParts(now);
 const part=(name:string)=>Number(parts.find(p=>p.type===name)!.value);
 const monday=new Date(Date.UTC(part('year'),part('month')-1,part('day')));
 monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 const next=new Date(monday);next.setUTCDate(next.getUTCDate()+7);
 // A London Monday midnight is either 00:00 UTC or 23:00 UTC Sunday.
 next.setTime(next.getTime()-Number(londonHour.format(next))*3600000);
 return {period,week:monday.toISOString().slice(0,10),resetsAt:next.toISOString()};
}
export function readBoardWindow(q:URLSearchParams,now=new Date()) {
 const period=q.get('period')??'weekly';
 if(period!=='weekly'&&period!=='all-time')return null;
 return boardWindow(period,now);
}
export function periodBoardKey(key:string,window:BoardWindow) {
 return window.period==='weekly'?`${key}:week:${window.week}`:key;
}
