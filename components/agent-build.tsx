"use client";
import {useEffect,useRef,type RefObject} from 'react';
const crew=['Subagent','Claude','Codex'];
export function AgentBuild({view,container}:{view:string;container:RefObject<HTMLDivElement|null>}) {
 const layer=useRef<HTMLDivElement>(null),drawing=useRef<SVGSVGElement>(null);
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scope=container.current,overlay=layer.current,svg=drawing.current;
  if(!scope||!overlay||!svg||reduced.matches)return;
  const bounds=scope.getBoundingClientRect();
  const cards=Array.from(scope.querySelectorAll<HTMLElement>('[data-build-card]')).filter(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight-80&&r.bottom>0;}).slice(0,8);
  if(!cards.length)return;
  const rects=cards.map(e=>{const r=e.getBoundingClientRect();return{x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height};});
  const first=rects[0],second=rects[1]||first,third=rects[2]||first;
  const right=Math.min(bounds.width-10,first.x+first.w),bottom=Math.min(innerHeight-bounds.top-30,first.y+first.h);
  const routes=[
   `M${first.x+8} ${first.y+10} C${right*.3} 0 ${right*.7} 0 ${right} 10 L${right} ${bottom}`,
   `M${second.x+second.w-20} ${second.y+28} C${second.x+second.w-4} ${second.y+second.h*.3} ${second.x+second.w-4} ${second.y+second.h*.65} ${second.x+second.w-20} ${second.y+second.h*.7} L${second.x+30} ${second.y+second.h*.7}`,
   `M${third.x+third.w*.22} ${third.y+third.h*.25} C${third.x+third.w*.8} ${third.y+third.h*.08} ${third.x+third.w*.8} ${third.y+third.h*.5} ${third.x+third.w*.36} ${third.y+third.h*.43} Q${third.x+third.w*.15} ${third.y+third.h*.6} ${third.x+third.w*.6} ${third.y+third.h*.58}`,
  ];
  svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
  const animations:Animation[]=[];
  routes.forEach((route,i)=>{
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',route);path.setAttribute('class',i===0?'agentGuide':'agentOutline');path.setAttribute('pathLength','1');svg.append(path);
   const duration=2800-i*140;
   animations.push(path.animate([{opacity:0,strokeDashoffset:1},{opacity:.6,strokeDashoffset:.95,offset:.12},{opacity:.6,strokeDashoffset:0,offset:.82},{opacity:0,strokeDashoffset:0}],{duration,delay:i*140,fill:'both'}));
   const length=path.getTotalLength();const cursor=overlay.querySelectorAll<HTMLElement>('.agentCursor')[i];
   const frames=Array.from({length:41},(_,step)=>{
    const t=step/40;
    // Separate route geometry and pacing: smooth guide sweep, card outline, then two detail gestures.
    const progress=i===0?t:i===1?(t<.45?t*.65:.2925+(t-.45)*1.28636):(t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2);
    const point=path.getPointAtLength(Math.max(0,Math.min(1,progress))*length);
    return {offset:t,transform:`translate(${Math.max(4,Math.min(bounds.width-105,point.x))}px,${Math.max(4,Math.min(innerHeight-bounds.top-40,point.y))}px)`,opacity:t<.08?t/.08:t>.9?(1-t)/.1:1};
   });
   animations.push(cursor.animate(frames,{duration,delay:i*140,fill:'both',easing:'linear'}));
  });
  const stop=()=>{animations.forEach(a=>a.cancel());svg.replaceChildren();};
  const modal=new MutationObserver(()=>{if(document.querySelector('dialog[open]'))stop();});modal.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  const initialScroll=scrollY,onScroll=()=>{if(scrollY!==initialScroll)stop();};
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',stop);document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);
  return()=>{stop();modal.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',stop);document.removeEventListener('visibilitychange',stop);reduced.removeEventListener('change',stop);};
 },[view,container]);
 return <div ref={layer} className="agentBuild" aria-hidden="true"><svg ref={drawing} className="agentDrawing"/>{crew.map((name,index)=><div className={`agentCursor crew${index}`} key={name}><svg width="23" height="27" viewBox="0 0 23 27" fill="currentColor"><path d="M2 2v20l6-6 5 9 4-2-5-9 9-1Z" stroke="var(--background)" strokeWidth="2"/></svg><span><strong>{name}</strong></span></div>)}</div>;
}
