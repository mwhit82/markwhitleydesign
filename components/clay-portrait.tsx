"use client";

import {usePortrait} from '@/lib/portrait/use-portrait';
import Image from 'next/image';
import Link from 'next/link';
import styles from './design-intro.module.css';

export function ClayPortrait({ready}: {ready: boolean}) {
  const {canvas, status} = usePortrait(ready);

  return (
    <Link href="/?view=design&profile=open" scroll={false}
      className={styles.portrait} aria-label="Open Mark Whitley's profile">
      <Image src="/portfolio/avatars/mark-clay.webp" alt="A smiling clay portrait of Mark Whitley"
        fill unoptimized priority className={styles.image}/>
      <canvas ref={canvas} data-ready={status === 'ready' || undefined} className={styles.clayCanvas} aria-hidden="true"/>
    </Link>
  );
}
