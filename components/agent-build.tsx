"use client";
import {useEffect,useRef,type RefObject} from 'react';
export function AgentBuild({view,container}:{view:string;container:RefObject<HTMLDivElement|null>}){
 const layer=useRef<HTMLDivElement>(null);
 useEffect(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');if(reduced.matches)return;
 const scope=container.current,overlay=layer.current;if(!scope||!overlay)return;
 const cards=Array.from(scope.querySelectorAll<HTMLElement>('[data-build-card]')).slice(0,8);
 const animations:Animation[]=[];
 const bounds=scope.getBoundingClientRect();
 cards.forEach((card,i)=>animations.push(card.animate([{opacity:.2,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:100+i*65,fill:'backwards',easing:'cubic-bezier(.2,.7,.2,1)'})));
 Array.from(overlay.children).forEach((cursor,index)=>{
 const targets=cards.filter((_,i)=>i%2===index).slice(0,3);
 if(!targets.length)return;
 const frames:Keyframe[]=[{transform:`translate(${index?bounds.width-80:16}px,-24px)`,opacity:0,offset:0}];
 targets.forEach((target,i)=>{const r=target.getBoundingClientRect();frames.push({transform:`translate(${Math.max(8,Math.min(bounds.width-100,r.left-bounds.left+r.width*.65))}px,${Math.min(420,r.top-bounds.top+50)}px)`,opacity:1,offset:.18+i*.25});});
 frames.push({opacity:0,offset:1});animations.push(cursor.animate(frames,{duration:1200,easing:'ease-in-out',fill:'both'}));
 });
 const stop=()=>animations.forEach(animation=>animation.cancel());reduced.addEventListener('change',stop);return()=>{stop();reduced.removeEventListener('change',stop);};
 },[view,container]);
 return <div ref={layer} className="agentBuild" aria-hidden="true">{['Codex','Claude'].map(name=><div className={`agentCursor ${name.toLowerCase()}`} key={name}><svg width="23" height="27" viewBox="0 0 23 27" fill="currentColor"><path d="M2 2v20l6-6 5 9 4-2-5-9 9-1Z" stroke="var(--background)" strokeWidth="2"/></svg><span>{name}</span></div>)}</div>;
}
