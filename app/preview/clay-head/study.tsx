"use client";

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import {usePortrait} from '@/lib/portrait/use-portrait';
import type {Pose} from '@/lib/portrait/scene';
import styles from './study.module.css';

const choices: Pose[] = ['Live', 'Neutral', 'Left', 'Right'];
const artwork = '/portfolio/avatars/mark-clay.webp';

export function HeadStudy() {
  const [pose, setPose] = useState<Pose>('Live');
  const {canvas, status} = usePortrait(true, pose);

  return <article className={styles.study}>
    <h1>Clay portrait study<span>.</span></h1>
    <p>Move your pointer near the portrait or scroll on your phone. Choose a pose to hold the head still.</p>
    <div className={styles.comparison}>
      <section aria-labelledby="model-heading">
        <h2 id="model-heading">Blender head</h2>
        <Link href="?profile=open" scroll={false} aria-label="Open Mark Whitley's profile" className={styles.circle}>
          <Image src={artwork} alt="" fill unoptimized priority/>
          <canvas ref={canvas} className={status === 'ready' ? styles.ready : undefined} aria-hidden="true"/>
        </Link>
        <div className={styles.controls} role="group" aria-label="Portrait pose">
          {choices.map(value => <button key={value} type="button" disabled={status !== 'ready'}
            aria-pressed={pose === value} onClick={() => setPose(value)}>{value}</button>)}
        </div>
        <div className={styles.status} role="status">
          {status === 'loading' && 'Loading the 3D head…'}
          {status === 'reduced' && 'Showing the illustration for reduced motion.'}
          {status === 'unavailable' && 'The 3D preview is unavailable. Showing the illustration.'}
        </div>
      </section>
      <section aria-labelledby="reference-heading">
        <h2 id="reference-heading">Original artwork</h2>
        <div className={styles.circle}><Image src={artwork} alt="The original smiling clay portrait" fill unoptimized priority/></div>
      </section>
    </div>
  </article>;
}
