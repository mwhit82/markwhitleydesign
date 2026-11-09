"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Photograph } from "@/data/photography";
import { PhotoImage } from "./photo-image";
import { PhotoCredit } from "./credit";
import { Reveal } from "./reveal";
import styles from "./photography.module.css";
const Lightbox=dynamic(()=>import('./lightbox').then(module=>module.Lightbox),{ssr:false});
export function PhotographyGallery({photos}: {photos:Photograph[]}) {
  const [active,setActive]=useState<number|null>(null);
  const [visibleCount,setVisibleCount]=useState(24);
  const revealIndex=useRef<number|null>(null);
  const grid=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    // Featured links can point to photographs beyond the first batch.
    const revealAnchor=()=>{
      let id: string;
      try {id=decodeURIComponent(window.location.hash.slice(1));} catch {return;}
      const index=photos.findIndex(photo=>`photo-${photo.id}`===id);
      if(index>=24){revealIndex.current=index;setVisibleCount(count=>Math.max(count,Math.ceil((index+1)/24)*24));}
    };
    revealAnchor();window.addEventListener('hashchange',revealAnchor);
    return ()=>window.removeEventListener('hashchange',revealAnchor);
  },[photos]);
  useEffect(()=>{
    const index=revealIndex.current;
    if(index!==null && index<visibleCount){
      document.getElementById(`photo-${photos[index].id}`)?.scrollIntoView({behavior:'instant'});
      revealIndex.current=null;
    }
  },[visibleCount,photos]);
  const loadMore=()=>{
    const firstNew=visibleCount-1;
    setVisibleCount(count=>Math.min(count+24,photos.length));
    // Let keyboard users continue at the first newly added photograph.
    requestAnimationFrame(()=>grid.current?.querySelectorAll<HTMLButtonElement>('button')[firstNew]?.focus({preventScroll:true}));
  };
  const renderPhoto=(photo:Photograph,index:number,hero=false)=><figure id={`photo-${photo.id}`} className={hero?styles.heroFigure:styles.galleryFigure}>
    <button className={styles.photoButton} onClick={()=>setActive(index)} aria-label={`View photograph ${index+1}: ${photo.title || photo.alt}`} style={{aspectRatio:hero?'16 / 9':`${photo.width} / ${photo.height}`}}>
      <PhotoImage photo={photo} priority={hero} sizes={hero?'90vw':`(max-width:700px) calc(100vw - 40px), ${[75,50,32,24,41,41,32][(index-1)%7]}vw`}/><span className={styles.openHint} aria-hidden="true">View photograph ↗</span>
    </button><figcaption><span>{String(index+1).padStart(2,'0')} / {photo.title || 'Untitled'}{photo.location && ` — ${photo.location}`}</span>{photo.description && <p className={styles.description}>{photo.description}</p>}<PhotoCredit photo={photo}/></figcaption>
  </figure>;
  return <>
    {photos[0] && renderPhoto(photos[0],0,true)}
    <div className={styles.galleryIntro} id="selected-photographs"><span>THE COLLECTION</span><p>A closer look.<br/><em>A different perspective.</em></p><span>{String(photos.length).padStart(2,'0')} PHOTOGRAPHS</span></div>
    <div ref={grid} className={styles.galleryGrid}>{photos.slice(1,visibleCount).map((photo,index)=><Reveal key={photo.id} className={styles.galleryItem}>{renderPhoto(photo,index+1)}</Reveal>)}</div>
    <div className={styles.loadMore}><p role="status">Showing {Math.min(visibleCount,photos.length)} of {photos.length} photographs</p>{visibleCount<photos.length && <button onClick={loadMore}>Load more photographs <span aria-hidden="true">↓</span></button>}</div>
    {active!==null && <Lightbox photos={photos} index={active} onChange={setActive} onClose={()=>setActive(null)}/>}
  </>;
}
