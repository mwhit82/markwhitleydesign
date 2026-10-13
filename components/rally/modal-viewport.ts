import {useEffect,type RefObject} from 'react';
/** Keep overlays inside the visible portion of the game, including iOS keyboard pans. */
export function useModalViewport(ref:RefObject<HTMLDivElement|null>){useEffect(()=>{const viewport=window.visualViewport;let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const root=ref.current;if(!root)return;const r=root.getBoundingClientRect(),top=Math.max(0,(viewport?.offsetTop??0)-r.top),left=Math.max(0,(viewport?.offsetLeft??0)-r.left);root.style.setProperty('--modal-top',`${top}px`);root.style.setProperty('--modal-left',`${left}px`);root.style.setProperty('--modal-width',`${Math.max(0,Math.min(r.right,(viewport?.offsetLeft??0)+(viewport?.width??innerWidth))-r.left-left)}px`);root.style.setProperty('--modal-height',`${Math.max(0,Math.min(r.bottom,(viewport?.offsetTop??0)+(viewport?.height??innerHeight))-r.top-top)}px`);const focus=document.activeElement;if(focus instanceof HTMLInputElement&&root.contains(focus))focus.scrollIntoView({block:'nearest',inline:'nearest'});});};update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);document.addEventListener('focusin',update);const observer=new ResizeObserver(update);if(ref.current)observer.observe(ref.current);return()=>{cancelAnimationFrame(frame);observer.disconnect();viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);document.removeEventListener('focusin',update);};},[ref]);}

/** Isolate the frontmost dialog, including menus opened by the room component. */
export function useModalIsolation(ref:RefObject<HTMLDivElement|null>){
 useEffect(()=>{
  const root=ref.current;if(!root)return;
  let current:HTMLElement|null=null;let restore:HTMLElement|null=null;const disabled=new Map<HTMLElement,boolean>();
  const clear=()=>{for(const [el,value] of disabled)el.inert=value;disabled.clear();};
  const update=()=>{
   const dialogs=Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(el=>el.getClientRects().length>0);
   const next=dialogs.at(-1)??null;if(next===current)return;
   clear();const previous=current;current=next;
   if(next){if(!previous)restore=document.activeElement instanceof HTMLElement?document.activeElement:null;
    let child:HTMLElement=next;
    while(child!==root&&child.parentElement){for(const sibling of Array.from(child.parentElement.children))if(sibling instanceof HTMLElement&&sibling!==child){disabled.set(sibling,sibling.inert);sibling.inert=true;}child=child.parentElement;}
    if(!next.contains(document.activeElement))(next.querySelector<HTMLElement>('[data-menu-default]')??next.querySelector<HTMLElement>('button,input,select'))?.focus({preventScroll:true});
   }else if(previous&&restore?.isConnected){restore.focus({preventScroll:true});restore=null;}
  };
  const observer=new MutationObserver(update);observer.observe(root,{childList:true,subtree:true});update();
  return()=>{observer.disconnect();clear();};
 },[ref]);
}
