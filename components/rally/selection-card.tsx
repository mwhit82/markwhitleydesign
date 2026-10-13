/* eslint-disable @next/next/no-img-element -- Pre-sized local WebP screenshots, no image service required. */
'use client';
import {useEffect,useRef,useState} from 'react';
import {HudIcon} from './ui';
import styles from './rally.module.css';
export type CardOption={value:string;label:string;detail:string;selected:boolean;image:string;icon?:string};
export function SelectionCard({title,options,onSelect,onClose}:{title:string;options:CardOption[];onSelect:(value:string)=>void;onClose:()=>void}){
 const [index,setIndex]=useState(Math.max(0,options.findIndex(o=>o.selected))),[failed,setFailed]=useState(false);const start=useRef<number|null>(null);const option=options[index];const step=(d:number)=>setIndex(i=>(i+d+options.length)%options.length);
 const nextImage=options[(index+1)%options.length].image,previousImage=options[(index+options.length-1)%options.length].image;
 useEffect(()=>{setFailed(false);for(const src of [nextImage,previousImage]){const img=new Image();img.src=src;}},[index,nextImage,previousImage]);
 return <div className={styles.optionScrim}><section className={styles.selectionCard} role="dialog" aria-modal="true" aria-label={title} data-rally-menu="true" data-carousel="true" onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();step(e.key==='ArrowLeft'?-1:1);}}}>
 <header><h2>{title}</h2><button onClick={onClose} aria-label="Close options">×</button></header>
 <div className={styles.cardImage} onTouchStart={e=>{start.current=e.touches[0].clientX;}} onTouchEnd={e=>{if(start.current!==null){const d=e.changedTouches[0].clientX-start.current;if(Math.abs(d)>45)step(d<0?1:-1);start.current=null;}}}>
 {!failed?<img style={{objectFit:option.image.endsWith(".svg")?"contain":"cover"}} src={option.image} alt={`${option.label} in Pocket Rally`} onError={()=>setFailed(true)}/>:<span>Preview unavailable</span>}
 <button data-carousel-previous aria-label="Previous option" onClick={()=>step(-1)}><HudIcon name="left"/></button><button data-carousel-next aria-label="Next option" onClick={()=>step(1)}><HudIcon name="right"/></button>
 </div><footer><div aria-live="polite"><small>{index+1} / {options.length}</small><h3>{option.icon&&<span aria-hidden="true">{option.icon} </span>}{option.label}</h3><p>{option.detail}</p></div><button className={styles.start} data-menu-default onClick={()=>onSelect(option.value)}>Select <HudIcon name="check"/></button></footer>
 </section></div>;
}
