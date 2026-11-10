"use client";
import {useEffect,type RefObject} from 'react';

/** One sleeping animation loop for the collection, rather than one loop per card. */
export function CardMotion({container,view}:{container:RefObject<HTMLDivElement|null>;view:string}) {
  useEffect(()=>{
    const scope=container.current;if(!scope)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const fine=matchMedia('(hover: hover) and (pointer: fine)');
    type Card={element:HTMLElement;visible:boolean;x:number;y:number;vx:number;vy:number};
    const cards:Card[]=[];
    let frame=0,last=0,px=-10000,py=-10000,speed=0,scrollImpulse=0,lastY=scrollY,pointerTime=0;
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){const card=cards.find(c=>c.element===entry.target);if(card)card.visible=entry.isIntersecting;}},{rootMargin:'40px'});
    const collect=()=>{for(const element of scope.querySelectorAll<HTMLElement>('[data-build-card]'))if(!cards.some(c=>c.element===element)){const card={element,visible:false,x:0,y:0,vx:0,vy:0};cards.push(card);observer.observe(element);}};
    collect();
    const blocked=()=>reduced.matches||document.hidden||!!document.querySelector('dialog[open]');
    const reset=()=>{cancelAnimationFrame(frame);frame=0;last=0;speed=0;scrollImpulse=0;px=py=-10000;for(const c of cards){c.x=c.y=c.vx=c.vy=0;c.element.style.removeProperty('transform');}};
    const tick=(now:number)=>{
      frame=0;if(blocked()){reset();return;}
      const dt=Math.min((now-(last||now-16))/1000,.032);last=now;
      speed*=Math.exp(-dt*5);scrollImpulse*=Math.exp(-dt*7);
      let moving=false;
      for(const c of cards){
        if(!c.visible){c.element.style.removeProperty('transform');c.x=c.y=c.vx=c.vy=0;continue;}
        const r=c.element.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
        const dx=px-cx,dy=py-cy;
        const distance=Math.hypot(Math.max(0,Math.abs(dx)-r.width/2),Math.max(0,Math.abs(dy)-r.height/2));
        const influence=fine.matches?Math.max(0,1-distance/180):0;
        const limit=view==='photography'?1.5:3;
        const strength=Math.min(1,.45+speed*.25)*influence;
        const tx=Math.max(-limit,Math.min(limit,(-dy/Math.max(120,r.height))*limit*strength+scrollImpulse*limit*.5));
        const ty=Math.max(-limit,Math.min(limit,(dx/Math.max(120,r.width))*limit*strength));
        c.vx+=(tx-c.x)*150*dt;c.vy+=(ty-c.y)*150*dt;
        c.vx*=Math.exp(-20*dt);c.vy*=Math.exp(-20*dt);
        c.x+=c.vx*dt;c.y+=c.vy*dt;
        const unsettled=Math.abs(c.x-tx)+Math.abs(c.y-ty)+Math.abs(c.vx)+Math.abs(c.vy)>.003;
        moving ||= unsettled;
        if(!unsettled){c.x=tx;c.y=ty;c.vx=c.vy=0;}
        c.element.style.transform=`perspective(900px) translateY(${(-c.x/limit*(view==='photography'?2:4)).toFixed(3)}px) rotateX(${c.x.toFixed(3)}deg) rotateY(${c.y.toFixed(3)}deg)`;
      }
      if(moving||speed>.005||Math.abs(scrollImpulse)>.005)frame=requestAnimationFrame(tick);else last=0;
    };
    const wake=()=>{if(!frame&&!blocked())frame=requestAnimationFrame(tick);};
    const pointer=(event:PointerEvent)=>{if(event.pointerType==='touch')return;const now=performance.now();if(pointerTime&&px>-9999)speed=Math.min(3,Math.hypot(event.clientX-px,event.clientY-py)/Math.max(8,now-pointerTime));px=event.clientX;py=event.clientY;pointerTime=now;wake();};
    const leave=()=>{px=py=-10000;speed=0;wake();};
    const scroll=()=>{scrollImpulse=Math.max(-1,Math.min(1,(scrollY-lastY)/90));lastY=scrollY;wake();};
    const mutation=new MutationObserver(()=>{collect();if(blocked())reset();});
    mutation.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    window.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('pointerleave',leave);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('blur',reset);window.addEventListener('resize',reset);document.addEventListener('visibilitychange',reset);reduced.addEventListener('change',reset);
    return()=>{reset();observer.disconnect();mutation.disconnect();window.removeEventListener('pointermove',pointer);document.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',scroll);window.removeEventListener('blur',reset);window.removeEventListener('resize',reset);document.removeEventListener('visibilitychange',reset);reduced.removeEventListener('change',reset);};
  },[container,view]);
  return null;
}
