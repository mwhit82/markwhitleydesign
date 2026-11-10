"use client";
import {useEffect,useRef,type RefObject} from 'react';
const crew=[{name:'Codex Layout',task:'Drawing the grid'},{name:'Claude',task:'Shaping the cards'},{name:'Codex',task:'Adding the details'}];
export function AgentBuild({view,container}:{view:string;container:RefObject<HTMLDivElement|null>}) {
  const layer=useRef<HTMLDivElement>(null),drawing=useRef<SVGSVGElement>(null);
  useEffect(()=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const scope=container.current,overlay=layer.current,svg=drawing.current;
    if(!scope||!overlay||!svg||reduced.matches)return;
    const bounds=scope.getBoundingClientRect();
    const cards=Array.from(scope.querySelectorAll<HTMLElement>('[data-build-card]')).filter(card=>{const r=card.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).slice(0,8);
    if(!cards.length)return;
    const animations:Animation[]=[];
    const rectangles=cards.map(card=>{const r=card.getBoundingClientRect();return{x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height};});
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    // These temporary strokes sit above the real layout, without moving it or blocking interaction.
    rectangles.forEach((r,i)=>{
      const outline=document.createElementNS('http://www.w3.org/2000/svg','rect');
      for(const [key,value] of Object.entries({x:r.x+1,y:r.y+1,width:r.w-2,height:r.h-2,rx:12,pathLength:1}))outline.setAttribute(key,String(value));
      outline.setAttribute('class','agentOutline');svg.append(outline);
      animations.push(outline.animate([{strokeDashoffset:1,opacity:0},{strokeDashoffset:1,opacity:.85,offset:.1},{strokeDashoffset:0,opacity:.85,offset:.7},{strokeDashoffset:0,opacity:0}],{duration:3600,delay:700+(i%3)*350,fill:'both',easing:'ease-in-out'}));
      animations.push(cards[i].animate([{opacity:.65},{opacity:1}],{duration:1000,delay:1200+i*180,fill:'backwards'}));
    });
    const guide=document.createElementNS('http://www.w3.org/2000/svg','path');
    guide.setAttribute('d',rectangles.map(r=>`M${r.x} 0V${Math.min(bounds.height,innerHeight-bounds.top)}M${r.x} ${r.y}h${r.w}`).join(' '));guide.setAttribute('class','agentGuide');guide.setAttribute('pathLength','1');svg.prepend(guide);
    animations.push(guide.animate([{strokeDashoffset:1,opacity:0},{strokeDashoffset:.5,opacity:.4,offset:.2},{strokeDashoffset:0,opacity:.4,offset:.6},{strokeDashoffset:0,opacity:0}],{duration:4800,fill:'both'}));
    Array.from(overlay.querySelectorAll<HTMLElement>('.agentCursor')).forEach((cursor,index)=>{
      const r=rectangles[index%rectangles.length];
      const x=Math.max(8,Math.min(bounds.width-160,r.x+22));
      const y=Math.max(24,r.y+42+index*(rectangles.length===1?60:30));
      animations.push(cursor.animate([
        {transform:`translate(${x}px,${y-30}px)`,opacity:0,offset:0},
        {transform:`translate(${x}px,${y}px)`,opacity:1,offset:.18},
        {transform:`translate(${x}px,${y}px)`,opacity:1,offset:.29},
        {transform:`translate(${Math.min(bounds.width-160,x+r.w*.4)}px,${y+35}px)`,opacity:1,offset:.55},
        {transform:`translate(${x+12}px,${Math.min(innerHeight-bounds.top-65,y+(rectangles.length===1?20:115))}px)`,opacity:1,offset:.77},
        {transform:`translate(${x+12}px,${Math.min(innerHeight-bounds.top-65,y+(rectangles.length===1?20:115))}px)`,opacity:1,offset:.9},
        {opacity:0,offset:1},
      ],{duration:5500-index*250,delay:index*250,fill:'both',easing:'ease-in-out'}));
    });
    const stop=()=>{animations.forEach(animation=>animation.cancel());svg.replaceChildren();};
    const modal=new MutationObserver(()=>{if(document.querySelector('dialog[open]'))stop();});
    modal.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    const initialScroll=scrollY;
    const onScroll=()=>{if(scrollY!==initialScroll)stop();};
    window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',stop,{once:true});document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);
    return()=>{stop();modal.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',stop);document.removeEventListener('visibilitychange',stop);reduced.removeEventListener('change',stop);};
  },[view,container]);
  return <div ref={layer} className="agentBuild" aria-hidden="true"><svg ref={drawing} className="agentDrawing"/>{crew.map((agent,index)=><div className={`agentCursor crew${index}`} key={agent.name}><svg width="23" height="27" viewBox="0 0 23 27" fill="currentColor"><path d="M2 2v20l6-6 5 9 4-2-5-9 9-1Z" stroke="var(--background)" strokeWidth="2"/></svg><span><strong>{agent.name}</strong><small>AI · {agent.task}</small></span></div>)}</div>;
}
