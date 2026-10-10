"use client";
import {useRef,useState,useEffect} from 'react';
import {wheelDelta,wheelInput} from './controls';
import styles from './rally.module.css';
// Relative angle drag, angle wrapping, pointer ownership and release-to-centre follow
// the familiar touchscreen-wheel interaction (Unity steering-wheel example, thread 512970).
export function TouchWheel({sensitivity,onInput}:{sensitivity:number;onInput:(value:number,held:boolean)=>void}){
 const [angle,setAngle]=useState(0);const pointer=useRef<number|null>(null);const previous=useRef(0);const rotation=useRef(0);const callback=useRef(onInput);callback.current=onInput;
 useEffect(()=>()=>callback.current(0,false),[]);
 const position=(event:React.PointerEvent<HTMLButtonElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return Math.atan2(event.clientY-rect.top-rect.height/2,event.clientX-rect.left-rect.width/2);};
 const release=()=>{pointer.current=null;rotation.current=0;setAngle(0);callback.current(0,false);};
 return <button className={styles.touchWheel} data-driving-control="true" aria-label="Steering wheel: drag around the rim to steer" data-held={pointer.current!==null} onPointerDown={e=>{
  if(pointer.current!==null)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointer.current=e.pointerId;previous.current=position(e);callback.current(wheelInput(rotation.current,sensitivity),true);setAngle(rotation.current);
 }} onPointerMove={e=>{if(pointer.current!==e.pointerId)return;e.preventDefault();const next=position(e);rotation.current=Math.max(-Math.PI*.8,Math.min(Math.PI*.8,rotation.current+wheelDelta(previous.current,next)));previous.current=next;setAngle(rotation.current);callback.current(wheelInput(rotation.current,sensitivity),true);}}
 onPointerUp={e=>{if(pointer.current===e.pointerId)release();}} onPointerCancel={e=>{if(pointer.current===e.pointerId)release();}} onLostPointerCapture={e=>{if(pointer.current===e.pointerId)release();}} onContextMenu={e=>e.preventDefault()}>
  <span style={{transform:`rotate(${angle}rad)`}}><i/><b>●</b></span>
 </button>;
}
