"use client";
import {Icon} from '@/components/icon';
import {ArrowUpRight01Icon,ArrowDown01Icon} from '@hugeicons/core-free-icons';
import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import type {Photograph} from '@/data/photography';
import {PhotoImage} from './photo-image';
import {CameraSettings} from './camera-settings';
import {PhotoCredit} from './credit';
import styles from './photography.module.css';
const Lightbox=dynamic(()=>import('./lightbox').then(module=>module.Lightbox),{ssr:false});
export function PhotographyGallery({photos}:{photos:Photograph[]}){
 const [active,setActive]=useState<number|null>(null),[visibleCount,setVisibleCount]=useState(24);
 const grid=useRef<HTMLDivElement>(null),anchor=useRef<string|null>(null);
 useEffect(()=>{const reveal=()=>{let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const index=photos.findIndex(photo=>`photo-${photo.id}`===id);if(index<0)return;anchor.current=id;setVisibleCount(count=>Math.max(count,Math.ceil((index+1)/24)*24));requestAnimationFrame(()=>{document.getElementById(id)?.scrollIntoView({behavior:'instant',block:'start'});});};reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);},[photos]);
 useEffect(()=>{if(anchor.current)document.getElementById(anchor.current)?.scrollIntoView({behavior:'instant',block:'start'});},[visibleCount]);
 const more=()=>{const firstNew=visibleCount;setVisibleCount(count=>Math.min(count+24,photos.length));requestAnimationFrame(()=>grid.current?.querySelectorAll<HTMLButtonElement>('button')[firstNew]?.focus({preventScroll:true}));};
 return <>{photos.some(p=>p.placeholder)&&<p className={styles.viewerNotice}>Gallery preview — original photography coming soon</p>}<div ref={grid} className={styles.galleryGrid} id="selected-photographs">{photos.slice(0,visibleCount).map((photo,index)=><figure key={photo.id} id={`photo-${photo.id}`} className={styles.galleryFigure} data-build-card><button className={styles.photoButton} onClick={()=>setActive(index)} aria-label={`View photograph ${index+1}: ${photo.title||photo.alt}`} style={{aspectRatio:`${photo.width} / ${photo.height}`}}><PhotoImage photo={photo} priority={index===0} sizes="(max-width:639px) calc(100vw - 32px), (max-width:1023px) calc((100vw - 64px) / 2), (max-width:1439px) calc((100vw - 96px) / 3), calc((100vw - 112px) / 4)"/><span className={styles.openHint} aria-hidden="true"><Icon icon={ArrowUpRight01Icon} size={18}/></span></button><figcaption><span>{photo.title||'Untitled'}{photo.location&&` — ${photo.location}`}</span>{photo.description&&<p className={styles.description}>{photo.description}</p>}<CameraSettings photo={photo}/><PhotoCredit photo={photo}/></figcaption></figure>)}</div><div className={styles.loadMore}><p role="status">Showing {Math.min(visibleCount,photos.length)} of {photos.length} photographs</p>{visibleCount<photos.length&&<button onClick={more}>Load more photographs <Icon icon={ArrowDown01Icon} size={18}/></button>}</div>{active!==null&&<Lightbox photos={photos} index={active} onChange={setActive} onClose={()=>setActive(null)}/>}</>;
}
