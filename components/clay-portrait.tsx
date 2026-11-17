"use client";

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './design-intro.module.css';

export function ClayPortrait({ready}: {ready: boolean}) {
  const root = useRef<HTMLAnchorElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    if (!ready || !root.current || !canvas.current) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const element = root.current, surface = canvas.current;
    let dispose: (() => void) | undefined;
    let generation = 0, alive = true, visible = false, loading = false;
    const load = async () => {
      if (!alive || motion.matches || !visible || dispose || loading) return;
      const token = ++generation;
      loading = true;
      try {
        const {mountPortrait} = await import('@/lib/portrait/scene');
        if (!alive || token !== generation || motion.matches) return;
        const cleanup = await mountPortrait(surface, element, () => {if (alive && token === generation) setRendered(true);}, () => {if (alive) setRendered(false);});
        if (!alive || token !== generation || motion.matches) cleanup(); else dispose = cleanup;
      } catch { if (alive) setRendered(false); }
      finally { if (token === generation) loading = false; }
    };
    const change = () => {
      if (motion.matches) {generation++; loading = false; dispose?.(); dispose = undefined; setRendered(false);}
      else void load();
    };
    const observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; if (visible) void load();}, {rootMargin: '100px'});
    observer.observe(element);
    motion.addEventListener('change', change);
    return () => {alive = false; generation++; observer.disconnect(); motion.removeEventListener('change', change); dispose?.();};
  }, [ready]);
  return <Link ref={root} href="/?view=design&profile=open" scroll={false} className={styles.portrait} aria-label="Open Mark Whitley's profile">
    <Image src="/portfolio/mark-whitley.jpg" alt="Mark Whitley, smiling" fill sizes="(max-width: 639px) 192px, (max-width: 1023px) 240px, 300px" priority className={`${styles.image} ${styles.original} ${!rendered ? styles.visible : ''}`}/>
    <canvas ref={canvas} className={`${styles.clayCanvas} ${rendered ? styles.visible : ''}`} aria-hidden="true"/>
  </Link>;
}
