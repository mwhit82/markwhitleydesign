"use client";
import {Icon} from './icon';
import {Moon02Icon,Sun03Icon,ComputerIcon,Tick02Icon} from '@hugeicons/core-free-icons';
import {useEffect,useRef,useState} from 'react';
type Preference='dark'|'light'|'system';
const options=[{value:'dark',label:'Dark',icon:Moon02Icon},{value:'light',label:'Light',icon:Sun03Icon},{value:'system',label:'System',icon:ComputerIcon}] as const;
export function ThemeToggle(){
 const [preference,setPreference]=useState<Preference>('dark'),[open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),start=useRef(0);
 useEffect(()=>{setPreference(document.documentElement.dataset.themePreference as Preference||'dark');},[]);
 useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{const value=preference==='system'?(media.matches?'dark':'light'):preference;document.documentElement.dataset.theme=value;document.documentElement.classList.toggle('dark',value==='dark');};if(document.documentElement.dataset.themePreference===preference)apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[preference]);
 useEffect(()=>{if(!open)return;menu.current?.querySelectorAll<HTMLButtonElement>('button')[start.current]?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 const show=(index:number)=>{start.current=index;setOpen(true);};
 const selected=options.find(item=>item.value===preference)!;
 return <div className="themeControl" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}><button ref={trigger} className="themeTrigger" aria-label={`Colour theme: ${selected.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls="theme-menu" onClick={()=>open?close():show(options.indexOf(selected))} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(event.key==='ArrowDown'?0:2);}}}><Icon icon={selected.icon} size={20}/></button>{open&&<div ref={menu} id="theme-menu" className="themeMenu" role="menu" aria-label="Colour theme" onKeyDown={event=>{const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button')||[]),index=items.indexOf(document.activeElement as HTMLButtonElement);let next=index;if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key==='ArrowDown')next=(index+1)%items.length;else if(event.key==='ArrowUp')next=(index+items.length-1)%items.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=items.length-1;else return;event.preventDefault();items[next]?.focus();}}>{options.map(item=><button key={item.value} role="menuitemradio" aria-checked={preference===item.value} tabIndex={-1} onClick={()=>{document.documentElement.dataset.themePreference=item.value;try{localStorage.setItem('theme',item.value);}catch{}setPreference(item.value);close();}}><Icon icon={item.icon} size={18}/><span>{item.label}</span>{preference===item.value&&<Icon icon={Tick02Icon} size={16}/>}</button>)}</div>}</div>;
}
