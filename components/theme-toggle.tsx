"use client";
import {Icon} from './icon';
import {Moon02Icon} from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
type Preference='dark'|'light'|'system';
export function ThemeToggle(){
 const [preference,setPreference]=useState<Preference>('dark');
 useEffect(()=>{const initial=document.documentElement.dataset.themePreference as Preference;setPreference(initial||'dark');},[]);
 useEffect(()=>{
 const media=matchMedia('(prefers-color-scheme: dark)');
 const apply=()=>{const value=preference==='system'?(media.matches?'dark':'light'):preference;document.documentElement.dataset.theme=value;document.documentElement.classList.toggle('dark',value==='dark');};
 // The initial inline script owns first paint; only apply a matching hydrated preference.
 if(document.documentElement.dataset.themePreference===preference)apply();
 media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[preference]);
 return <label className="themeControl"><span className="srOnly">Colour theme</span><Icon icon={Moon02Icon} size={16}/><select aria-label="Colour theme" value={preference} onChange={e=>{const value=e.target.value as Preference;document.documentElement.dataset.themePreference=value;try{localStorage.setItem('theme',value);}catch{}setPreference(value);}}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>;
}
