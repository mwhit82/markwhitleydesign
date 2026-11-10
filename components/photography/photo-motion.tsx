"use client";
import {relativePhotoTilt} from '@/lib/photo-orientation';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
export type PhotoMotionValue={x:number;y:number;active:boolean;tilting?:boolean;onFrame?:()=>void;wake?:()=>void};
type Entry={element:HTMLElement;motion:PhotoMotionValue;visible:boolean};
type MotionContext={allowed:boolean;reduced:boolean;register:(element:HTMLElement,motion:PhotoMotionValue)=>()=>void;enabled:boolean;toggle:()=>void;canTilt:boolean;tilting:boolean;enableTilt:()=>void;status:string};
const Context=createContext<MotionContext|null>(null);
export function usePhotoMotion(){const value=useContext(Context);if(!value)throw new Error('Photo motion requires a provider');return value;}
export function PhotoMotionProvider({enabled:dialogClosed,children}:{enabled:boolean;children:ReactNode}){
 const [enabled,setEnabled]=useState(true),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(true),[canTilt,setCanTilt]=useState(false),[tilting,setTilting]=useState(false),[status,setStatus]=useState('');
 const entries=useRef(new Set<Entry>()),wake=useRef(()=>{}),tilt=useRef({x:0,y:0}),baseline=useRef<{beta:number;gamma:number}|null>(null);
 const allowed=enabled&&!reduced&&visible&&dialogClosed;
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches),visibility=()=>setVisible(!document.hidden);change();visibility();setCanTilt(navigator.maxTouchPoints>0&&'DeviceOrientationEvent'in window&&window.isSecureContext);try{setEnabled(localStorage.getItem('photo-motion')!=='off');}catch{}media.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{
  const collection=entries.current;
  let frame=0,last=0,px=-10000,py=-10000;
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const tick=(time:number)=>{
   frame=0;const dt=Math.min((time-(last||time-16))/1000,.04);last=time;let moving=false;
   const measurements=[...collection].map(entry=>({entry,r:entry.element.getBoundingClientRect()}));
   for(const {entry,r} of measurements){
    const active=allowed&&entry.visible&&!document.querySelector('[data-changing="true"]');
    const scroll=active?Math.max(-1,Math.min(1,(innerHeight/2-r.top-r.height/2)/(innerHeight*.65))):0;
    const near=fine.matches&&px>=r.left-60&&px<=r.right+60&&py>=r.top-60&&py<=r.bottom+60;
    const pointerX=near?Math.max(-1,Math.min(1,(px-r.left-r.width/2)/(r.width/2))):0;
    const pointerY=near?Math.max(-1,Math.min(1,(py-r.top-r.height/2)/(r.height/2))):0;
    const x=active?Math.max(-1,Math.min(1,tilt.current.x+pointerX*.7)):0;
    const y=active?Math.max(-1,Math.min(1,scroll*(tilting?.2:.6)+tilt.current.y+pointerY*.3)):0;
    const m=entry.motion;m.active=active;m.tilting=tilting;
    m.x+=(x-m.x)*(1-Math.exp(-dt*10));m.y+=(y-m.y)*(1-Math.exp(-dt*10));
    if(Math.abs(m.x-x)+Math.abs(m.y-y)>.0005)moving=true;else{m.x=x;m.y=y;}
    entry.element.style.setProperty('--photo-scale',tilting?'1.18':'1.06');entry.element.style.setProperty('--photo-travel',tilting?'5%':'1.2%');entry.element.style.setProperty('--photo-x',String(m.x));entry.element.style.setProperty('--photo-y',String(m.y));m.onFrame?.();
   }
   if(moving)frame=requestAnimationFrame(tick);else last=0;
  };
  const start=()=>{if(!frame)frame=requestAnimationFrame(tick);};wake.current=start;
  const observer=new IntersectionObserver(items=>{for(const item of items){const entry=[...collection].find(e=>e.element===item.target);if(entry)entry.visible=item.isIntersecting;}start();});
  for(const entry of collection)observer.observe(entry.element);
  // Registration changes are infrequent (initial gallery or Load more).
  const added=(event:Event)=>observer.observe((event as CustomEvent<HTMLElement>).detail);
  const pointer=(event:PointerEvent)=>{if(event.pointerType==='touch')return;px=event.clientX;py=event.clientY;start();};const leave=()=>{px=py=-10000;start();};
  const transitions=new MutationObserver(start);transitions.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-changing']});
  window.addEventListener('photo-scene-added',added);window.addEventListener('scroll',start,{passive:true});window.addEventListener('resize',start);window.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('pointerleave',leave);start();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();transitions.disconnect();wake.current=()=>{};window.removeEventListener('photo-scene-added',added);window.removeEventListener('scroll',start);window.removeEventListener('resize',start);window.removeEventListener('pointermove',pointer);document.removeEventListener('pointerleave',leave);for(const entry of collection){entry.motion.active=false;entry.motion.x=entry.motion.y=0;entry.element.style.removeProperty('--photo-x');entry.element.style.removeProperty('--photo-y');}};
 },[allowed,tilting]);
 useEffect(()=>{
  if(!tilting||!allowed)return;
  baseline.current=null;let received=false;
  const orientation=(event:DeviceOrientationEvent)=>{
   if(event.beta===null||event.gamma===null||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;received=true;
   baseline.current??={beta:event.beta,gamma:event.gamma};
   tilt.current=relativePhotoTilt(event.beta,event.gamma,baseline.current,screen.orientation?.angle||0)||{x:0,y:0};wake.current();
  };
  const recalibrate=()=>{baseline.current=null;tilt.current={x:0,y:0};};
  window.addEventListener('deviceorientation',orientation);window.addEventListener('orientationchange',recalibrate);
  const timer=setTimeout(()=>{if(!received){setStatus('Phone tilt is unavailable. Scroll motion still works.');setTilting(false);}},4000);
  return()=>{clearTimeout(timer);window.removeEventListener('deviceorientation',orientation);window.removeEventListener('orientationchange',recalibrate);tilt.current={x:0,y:0};baseline.current=null;};
 },[tilting,allowed]);
 const enableTilt=async()=>{
  if(tilting){setTilting(false);tilt.current={x:0,y:0};wake.current();return;}
  try{
   const sensor=DeviceOrientationEvent as typeof DeviceOrientationEvent & {requestPermission?:()=>Promise<string>};
   if(sensor.requestPermission&&await sensor.requestPermission()!=='granted'){setStatus('Tilt permission was declined. Scroll motion still works.');return;}
   setStatus('');baseline.current=null;setTilting(true);
  }catch{setStatus('Phone tilt is unavailable. Scroll motion still works.');}
 };
 const register=(element:HTMLElement,motion:PhotoMotionValue)=>{const entry={element,motion,visible:false};entries.current.add(entry);motion.wake=()=>wake.current();window.dispatchEvent(new CustomEvent('photo-scene-added',{detail:element}));return()=>{entries.current.delete(entry);motion.wake=undefined;};};
 const toggle=()=>{setEnabled(value=>{try{localStorage.setItem('photo-motion',value?'off':'on');}catch{}return !value;});};
 return <Context.Provider value={{allowed,reduced,register,enabled,toggle,canTilt:canTilt&&!reduced,tilting,enableTilt:()=>{void enableTilt();},status}}>{children}</Context.Provider>;
}
export function PhotoMotionControls(){const motion=usePhotoMotion();return <div className="photoMotionControls"><button type="button" onClick={motion.toggle} disabled={motion.reduced} aria-pressed={motion.enabled&&!motion.reduced}>Photo motion {motion.enabled&&!motion.reduced?'on':'off'}</button>{motion.canTilt&&motion.enabled&&<button type="button" onClick={motion.enableTilt} aria-pressed={motion.tilting}>{motion.tilting?'Disable tilt':'Enable tilt'}</button>}<span role="status">{motion.status}</span></div>;}
