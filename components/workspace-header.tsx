"use client";
import {useEffect,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {LogoMark} from './logo-mark';
import {SiteNavigation} from './site-navigation';
import {ThemeToggle} from './theme-toggle';
import {ResumeDrawer} from './resume-drawer';
export function WorkspaceHeader(){
 const pathname=usePathname(),params=useSearchParams();const [open,setOpen]=useState(false);
 const view=pathname.startsWith('/work/')?'design':pathname.startsWith('/playground/')?'games':params.get('view')==='games'?'games':params.get('view')==='photography'?'photography':'design';
 useEffect(()=>{setOpen(params.get('profile')==='open');},[params]);
 const close=()=>{setOpen(false);if(params.has('profile')){const url=new URL(location.href);url.searchParams.delete('profile');history.replaceState(null,'',url.pathname+url.search+url.hash);}};
 return <><header className="workspaceHeader"><div className="identity"><LogoMark/><span className="headerDivider"/><Link className="nameButton" href="/?view=design">Mark Whitley</Link></div><SiteNavigation active={view}/><div className="headerTools"><div className="collaborators" aria-label="Mark and the AI tools he works with"><span className="toolAvatar" role="img" aria-label="Claude, AI tool" title="Claude · AI tool I work with"><span className="agentLogo claudeLogo"/></span><span className="toolAvatar" role="img" aria-label="Codex, AI tool" title="Codex · AI tool I work with"><span className="agentLogo codexLogo"/></span><button className="toolAvatar humanAvatar" aria-label="Open Mark Whitley's profile" onClick={()=>setOpen(true)}><Image src="/portfolio/mark-whitley.jpg" alt="" width={32} height={32}/></button></div><span className="headerDivider"/><ThemeToggle/></div></header>{open&&<ResumeDrawer onClose={close}/>}</>;
}
