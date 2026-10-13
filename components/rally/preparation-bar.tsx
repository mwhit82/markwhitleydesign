'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './rally.module.css';
/** Delay quick cache hits and keep displayed work stable without delaying the race. */
export function PreparationBar({step,onCancel}:{step:string;onCancel:()=>void}){
 const [shown,setShown]=useState('');const since=useRef(0);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined;if(step){if(since.current)setShown(step);else timer=setTimeout(()=>{since.current=performance.now();setShown(step);},200);}else if(since.current){timer=setTimeout(()=>{since.current=0;setShown('');},Math.max(0,400-(performance.now()-since.current)));}return()=>clearTimeout(timer);},[step]);
 return shown?<div className={styles.preparationBar} role="status"><span>{shown}</span><button disabled={!step} aria-label="Cancel preparation" onClick={onCancel}>×</button><i aria-hidden="true"/></div>:null;
}
