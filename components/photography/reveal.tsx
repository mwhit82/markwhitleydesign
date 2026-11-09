"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./photography.module.css";
export function Reveal({children,className=''}: {children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=ref.current;
    if(!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window))return;
    // Visible by default: unsupported browsers and no-JS views retain all content.
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){element.classList.add(styles.revealed);observer.unobserve(element);}}, {threshold:0.08});
    observer.observe(element);
    return ()=>observer.disconnect();
  },[]);
  return <div ref={ref} className={className}>{children}</div>;
}
