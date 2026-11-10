"use client";
import {useEffect,useRef,useState} from 'react';
export type CollectionView='design'|'games'|'photography';
export function useCollectionTransition(requested:CollectionView) {
 const [view,setView]=useState(requested),[ready,setReady]=useState(false);
 const host=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null);
 const current=useRef(requested),generation=useRef(0),mounted=useRef(false);
 useEffect(()=>{
  const shell=host.current,node=body.current;if(!shell||!node)return;
  if(!mounted.current){mounted.current=true;setReady(true);return;}
  let cancelled=false;const token=++generation.current;const animations:Animation[]=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const valid=()=>!cancelled&&generation.current===token;
  setReady(false);shell.dataset.changing='true';node.inert=true;
  const height=shell.getBoundingClientRect().height;shell.style.height=`${height}px`;
  const run=async()=>{
   try {
    if(current.current!==requested&&!reduced.matches){
     const exit=node.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:120,easing:'ease-out',fill:'forwards'});animations.push(exit);await exit.finished;
    }
    if(!valid())return;
    current.current=requested;setView(requested);
    // Let React commit the incoming collection before measuring its actual height.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    if(!valid())return;
    animations.forEach(a=>a.cancel());animations.length=0;
    if(!reduced.matches){
     if(requested==='photography')setReady(true);
     const incoming=requested==='photography'?(node.querySelector('header')||node):node;
     const entry=incoming.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
     animations.push(entry,shell.animate([{height:`${height}px`},{height:`${node.getBoundingClientRect().height}px`}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'}));
     await entry.finished;
    }
    if(!valid())return;
    animations.forEach(a=>a.cancel());shell.style.height='';delete shell.dataset.changing;node.inert=false;setReady(true);
    if(location.hash.startsWith('#photo-'))document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block:'start',behavior:'instant'});
   }catch{
    if(valid()){current.current=requested;setView(requested);animations.forEach(a=>a.cancel());shell.style.height='';delete shell.dataset.changing;node.inert=false;setReady(true);}
   }
  };
  void run();
  return()=>{cancelled=true;animations.forEach(a=>a.cancel());shell.style.height='';delete shell.dataset.changing;node.inert=false;};
 },[requested]);
 return {view,ready,host,body};
}
