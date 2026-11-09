"use client";
import Image from "next/image";
import { useState } from "react";
import type { Photograph } from "@/data/photography";
import styles from "./photography.module.css";

export function PhotoImage({photo,priority=false,lightbox=false,sizes}: {photo:Photograph;priority?:boolean;lightbox?:boolean;sizes:string}) {
  const [failed,setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const [loaded,setLoaded] = useState(false);
  const retryUrl=(src:string) => attempt ? `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}` : src;
  const className=lightbox ? styles.lightboxImage : styles.image;
  const events={onLoad:()=>setLoaded(true),onError:()=>setFailed(true)};
  const variants=photo.variants;
  const sourceSet=(format:'avif'|'webp')=>variants?.filter(variant=>variant.format===format).map(variant=>`${retryUrl(variant.src)} ${variant.width}w`).join(', ');
  const webp=variants?.filter(variant=>variant.format==='webp');
  return <>
    {!failed && (variants?.length ? <picture key={attempt} className={lightbox ? styles.viewerPicture : styles.picture}>
      <source type="image/avif" srcSet={sourceSet('avif')} sizes={sizes}/>
      <source type="image/webp" srcSet={sourceSet('webp')} sizes={sizes}/>
      {/* Pre-generated files use native responsive selection, without a second image optimisation pass. */}
      <img src={retryUrl(webp?.[0]?.src || photo.src)} srcSet={sourceSet('webp')} sizes={sizes} alt={photo.alt} width={photo.width} height={photo.height} className={className} loading={priority || lightbox ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" {...events}/>
    </picture> : <Image key={attempt} src={retryUrl(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} sizes={sizes} priority={priority} loading={lightbox ? 'eager' : undefined} className={className} {...events}/>)}
    {lightbox && !loaded && !failed && <span className={styles.loading} role="status">Loading photograph…</span>}
    {failed && <span className={styles.imageError} role="status">This photograph couldn’t load.{lightbox ? <button type="button" onClick={()=>{setAttempt(value=>value+1);setFailed(false);setLoaded(false);}}>Try again</button> : <span>Open the viewer to retry.</span>}</span>}
  </>;
}
