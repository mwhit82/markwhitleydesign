"use client";
import Link from 'next/link';
export const navigation=[{href:'/?view=design',label:'Design'},{href:'/?view=games',label:'Games'},{href:'/?view=photography',label:'Photography'}];
export function SiteNavigation({className='',active=''}:{className?:string;active?:string}){return <nav aria-label="Main navigation" className={`editorialNav ${className}`}>{navigation.map(item=><Link key={item.href} href={item.href} scroll={false} aria-current={active===item.label.toLowerCase()?'page':undefined} onClick={event=>{if(location.pathname==='/'&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();history.pushState(null,'',item.href);window.scrollTo({top:0,behavior:'instant'});}}}>{item.label}</Link>)}</nav>;}
