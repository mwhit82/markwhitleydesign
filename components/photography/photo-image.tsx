"use client";
import Image from "next/image";
import { useState } from "react";
import type { Photograph } from "@/data/photography";
import styles from "./photography.module.css";
export function PhotoImage({photo,priority=false,lightbox=false,sizes}: {photo:Photograph;priority?:boolean;lightbox?:boolean;sizes:string}) {
  const [failed,setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const [loaded,setLoaded] = useState(false);
  const src = attempt ? `${photo.src}${photo.src.includes('?') ? '&' : '?'}retry=${attempt}` : photo.src;
  return <>
    {!failed && <Image key={attempt} src={src} alt={photo.alt} width={photo.width} height={photo.height} sizes={sizes} priority={priority} className={lightbox ? styles.lightboxImage : styles.image} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}
    {lightbox && !loaded && !failed && <span className={styles.loading} role="status">Loading photograph…</span>}
    {failed && <span className={styles.imageError} role="status">This photograph couldn’t load.{lightbox ? <button type="button" onClick={()=>{setAttempt(value=>value+1);setFailed(false);setLoaded(false);}}>Try again</button> : <span>Open the viewer to retry.</span>}</span>}
  </>;
}
