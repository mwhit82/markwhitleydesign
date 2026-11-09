"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { Photograph } from "@/data/photography";
import { PhotoImage } from "./photo-image";
import { PhotoCredit } from "./credit";
import { Reveal } from "./reveal";
import styles from "./photography.module.css";
const Lightbox=dynamic(()=>import('./lightbox').then(module=>module.Lightbox),{ssr:false});
export function PhotographyGallery({photos}: {photos:Photograph[]}) {
  const [active,setActive]=useState<number|null>(null);
  const renderPhoto=(photo:Photograph,index:number,hero=false)=><figure id={`photo-${photo.id}`} className={hero?styles.heroFigure:styles.galleryFigure}>
    <button className={styles.photoButton} onClick={()=>setActive(index)} aria-label={`View photograph ${index+1}: ${photo.title || photo.alt}`} style={{aspectRatio:hero?'16 / 9':`${photo.width} / ${photo.height}`}}>
      <PhotoImage photo={photo} priority={hero} sizes={hero?'100vw':'(max-width:700px) 100vw, (max-width:1100px) 85vw, 70vw'}/><span className={styles.openHint} aria-hidden="true">View photograph ↗</span>
    </button><figcaption><span>{String(index+1).padStart(2,'0')} / {photo.title || 'Untitled'}{photo.location && ` — ${photo.location}`}</span><PhotoCredit photo={photo}/></figcaption>
  </figure>;
  return <>
    {photos[0] && renderPhoto(photos[0],0,true)}
    <div className={styles.galleryIntro} id="selected-photographs"><span>THE COLLECTION</span><p>A closer look.<br/><em>A different perspective.</em></p><span>{String(photos.length).padStart(2,'0')} PHOTOGRAPHS</span></div>
    <div className={styles.galleryGrid}>{photos.slice(1).map((photo,index)=><Reveal key={photo.id} className={styles.galleryItem}>{renderPhoto(photo,index+1)}</Reveal>)}</div>
    {active!==null && <Lightbox photos={photos} index={active} onChange={setActive} onClose={()=>setActive(null)}/>}
  </>;
}
