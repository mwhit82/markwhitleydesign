"use client";

import {useEffect, useRef} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './design-intro.module.css';

export function ClayPortrait({ready}: {ready: boolean}) {
  const root = useRef<HTMLAnchorElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = root.current;
    const artwork = image.current;
    const surface = canvas.current;
    if (!ready || !host || !artwork || !surface) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let nearViewport = false;
    let cancelled = false;
    let loading = false;
    let dispose: (() => void) | undefined;

    async function enhance() {
      if (!host || !artwork || !surface || cancelled || loading || dispose || !nearViewport || reduced.matches) return;
      loading = true;
      try {
        const [{mountPortrait}] = await Promise.all([import('@/lib/portrait/scene'), artwork.decode()]);
        if (!cancelled && nearViewport && !reduced.matches) {
          dispose = mountPortrait(surface, host, artwork);
        }
      } catch {
        // The artwork underneath the canvas is also the complete static portrait.
      } finally {
        loading = false;
      }
    }

    function motionChanged() {
      if (reduced.matches) {
        dispose?.();
        dispose = undefined;
      } else {
        void enhance();
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      nearViewport = entry.isIntersecting;
      if (nearViewport) void enhance();
    }, {rootMargin: '200px 0px'});
    observer.observe(host);
    reduced.addEventListener('change', motionChanged);
    return () => {
      cancelled = true;
      observer.disconnect();
      reduced.removeEventListener('change', motionChanged);
      dispose?.();
    };
  }, [ready]);

  return (
    <Link ref={root} href="/?view=design&profile=open" scroll={false}
      className={styles.portrait} aria-label="Open Mark Whitley's profile">
      <Image ref={image} src="/portfolio/avatars/mark-clay.webp" alt="A smiling clay portrait of Mark Whitley"
        fill unoptimized priority className={styles.image}/>
      <canvas ref={canvas} className={styles.clayCanvas} aria-hidden="true"/>
    </Link>
  );
}
