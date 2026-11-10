"use client";
import {useEffect,type RefObject} from 'react';
export function usePhotoReveal(grid:RefObject<HTMLDivElement|null>,ready:boolean,count:number){
 useEffect(()=>{
  const node=grid.current;if(!node||!ready)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');if(reduced.matches||!('IntersectionObserver'in window))return;
  const animations=new Set<Animation>();
  const observer=new IntersectionObserver(entries=>{entries.filter(entry=>entry.isIntersecting).forEach((entry,index)=>{observer.unobserve(entry.target);const el=entry.target as HTMLElement;if(el.dataset.revealed)return;el.dataset.revealed='true';try{const animation=el.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:Math.min(index*45,225),easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});animations.add(animation);void animation.finished.then(()=>animations.delete(animation)).catch(()=>{});}catch{/* Static photos remain visible when animations are unavailable. */}});},{threshold:.05});
  node.querySelectorAll('figure').forEach(el=>{if(!el.dataset.revealed)observer.observe(el);});
  const stop=()=>{if(reduced.matches){observer.disconnect();animations.forEach(animation=>animation.cancel());}};reduced.addEventListener('change',stop);
  return()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());reduced.removeEventListener('change',stop);};
 },[grid,ready,count]);
}
