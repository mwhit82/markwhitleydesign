"use client";
import {Suspense,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {WorkspaceHeader} from './workspace-header';
export function SiteShell({children}:{children:ReactNode}){const path=usePathname();const game=path.startsWith('/playground/')&&path!=='/playground/pocket-racers-vr';if(game)return <main>{children}</main>;return <div className="workspace"><Suspense fallback={<div className="headerPlaceholder"/>}><WorkspaceHeader/></Suspense><main id="main-content">{children}</main><footer className="workspaceFooter"><span>Designed & built by Mark Whitley.</span><span>Human curiosity. AI collaboration.</span></footer></div>;}
