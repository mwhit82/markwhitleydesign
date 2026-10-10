import type {ReactNode} from 'react';
export type IconName='pause'|'sound'|'muted'|'expand'|'contract'|'ghost'|'recover';
export function HudIcon({name}:{name:IconName}){
 const paths:Record<IconName,ReactNode>={
  pause:<><path d="M8 5v14M16 5v14" strokeWidth="3"/></>,
  sound:<><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8q5 4 0 8m3-11q8 7 0 14"/></>,
  muted:<><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 5 6m0-6-5 6"/></>,
  expand:<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>,
  contract:<path d="M3 9h6V3m6 0v6h6M9 21v-6H3m18 0h-6v6"/>,
  ghost:<><path d="M5 20v-9a7 7 0 0 1 14 0v9l-4-2-3 2-3-2Z"/><path d="M9 10v2m6-2v2"/></>,
  recover:<><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>,
 };
 return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
