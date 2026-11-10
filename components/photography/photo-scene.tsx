"use client";
import {Component,useEffect,useRef,useState,type ReactNode} from 'react';
import dynamic from 'next/dynamic';
import type {Photograph} from '@/data/photography';
import {PhotoImage} from './photo-image';
import {usePhotoMotion,type PhotoMotionValue} from './photo-motion';
const DepthCanvas=dynamic(()=>import('./photo-depth-canvas').then(m=>m.PhotoDepthCanvas),{ssr:false});
class DepthBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?null:this.props.children;}
}
export function PhotoScene({photo,priority,sizes}:{photo:Photograph;priority:boolean;sizes:string}){
 const {allowed,register}=usePhotoMotion();const element=useRef<HTMLSpanElement>(null),motion=useRef<PhotoMotionValue>({x:0,y:0,active:false});const [near,setNear]=useState(false);
 const registerRef=useRef(register);registerRef.current=register;
 useEffect(()=>{const el=element.current;if(!el)return;const remove=registerRef.current(el,motion.current);const observer=new IntersectionObserver(([entry])=>setNear(entry.isIntersecting),{rootMargin:'80px'});observer.observe(el);return()=>{remove();observer.disconnect();};},[]);
 return <span ref={element} className="photoScene" data-photo-motion={allowed?'on':'off'}><span className="photoPlane"><PhotoImage photo={photo} priority={priority} sizes={sizes}/></span>{allowed&&near&&photo.depth&&<DepthBoundary><DepthCanvas depth={photo.depth} motion={motion.current}/></DepthBoundary>}</span>;
}
