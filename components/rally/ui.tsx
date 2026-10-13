import type {ReactNode} from 'react';
export type IconName='wheel'|'people'|'settings'|'check'|'invite'|'camera'|'headset'|'screen'|'pause'|'sound'|'muted'|'expand'|'contract'|'ghost'|'recover'|'left'|'right'|'next';
export function HudIcon({name}:{name:IconName}){
 const paths:Record<IconName,ReactNode>={
  wheel:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="m3 10 7 2m4 0 7-2m-9 4v7"/></>,
  people:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m1 3q4 1 4 6v2"/></>,
  settings:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,
  check:<path d="m4 12 5 5L20 6"/>,
  invite:<><path d="M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8"/></>,
  camera:<><rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/></>,
  headset:<><path d="M4 13v-2a8 8 0 0 1 16 0v6q0 4-6 4"/><rect x="3" y="11" width="4" height="7" rx="1"/><rect x="17" y="11" width="4" height="7" rx="1"/><path d="M11 21h3"/></>,
  screen:<><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8m-4-4v4"/></>,
  left:<path d="M20 12H4m6-6-6 6 6 6"/>,
  right:<path d="M4 12h16m-6-6 6 6-6 6"/>,
  next:<path d="M6 18 18 6M7 6h11v11"/>,
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
