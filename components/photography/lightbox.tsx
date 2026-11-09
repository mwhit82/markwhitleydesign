"use client";
import { useEffect, useRef } from "react";
import type { Photograph } from "@/data/photography";
import { PhotoImage } from "./photo-image";
import { PhotoCredit } from "./credit";
import styles from "./photography.module.css";
export function Lightbox({photos,index,onChange,onClose}: {photos:Photograph[];index:number;onChange:(index:number)=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const touch=useRef<{x:number;y:number}|null>(null);
  const photo=photos[index];
  useEffect(()=>{
    const element=dialog.current;
    const opener=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow=document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow='hidden';
    closeButton.current?.focus();
    return ()=>{element?.close();document.body.style.overflow=overflow;opener?.focus({preventScroll:true});};
  },[]);
  const move=(delta:number)=>onChange((index+delta+photos.length)%photos.length);
  return <dialog ref={dialog} className={styles.lightbox} aria-label="Photograph viewer" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{
    if(event.key==='Tab') {
      const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
    }
    if(event.altKey || event.ctrlKey || event.metaKey)return;
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  }}>
    <header className={styles.lightboxHeader}><span>MARK WHITLEY / {photos.some(item=>item.placeholder) ? 'GALLERY PREVIEW' : 'PHOTOGRAPHY'}</span><button ref={closeButton} onClick={onClose} aria-label="Close photograph viewer">Close <span aria-hidden="true">×</span></button></header>
    <div className={styles.lightboxStage} onTouchStart={event=>{if(event.touches.length===1)touch.current={x:event.touches[0].clientX,y:event.touches[0].clientY};else touch.current=null;}} onTouchEnd={event=>{
      const start=touch.current;touch.current=null;if(!start || event.changedTouches.length!==1)return;
      const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;
      if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);
    }}>
      <PhotoImage key={photo.id} photo={photo} lightbox sizes={`min(94vw, ${Math.round(photo.width/photo.height*78)}vh)`}/>
    </div>
    <footer className={styles.lightboxFooter}><div><p aria-live="polite" aria-atomic="true">{String(index+1).padStart(2,'0')} / {photos.length} <span>— {photo.title || 'Untitled'}</span></p><PhotoCredit photo={photo}/></div><div className={styles.viewerControls}><button onClick={()=>move(-1)} aria-label="Previous photograph">←</button><button onClick={()=>move(1)} aria-label="Next photograph">→</button></div></footer>
    {photo.placeholder && <p className={styles.viewerNotice}>Gallery preview — original photography coming soon</p>}
  </dialog>;
}
