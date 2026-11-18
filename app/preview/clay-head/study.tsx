"use client";

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import type {Pose} from './viewer';
import styles from './study.module.css';

const choices: Pose[] = ['Live', 'Neutral', 'Left', 'Right'];
const artwork = '/portfolio/avatars/mark-clay.webp';
type Status = 'loading' | 'ready' | 'reduced' | 'unavailable';

export function HeadStudy() {
  const surface = useRef<HTMLCanvasElement>(null);
  const [pose, setPose] = useState<Pose>('Live');
  const [status, setStatus] = useState<Status>('loading');
  const choice = useRef<Pose>('Live');
  const refresh = useRef<() => void>(undefined);

  useEffect(() => {
    const canvas = surface.current;
    if (!canvas) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let controller: AbortController;
    let dispose: (() => void) | undefined;
    async function load() {
      controller?.abort();
      dispose?.();
      dispose = undefined;
      refresh.current = undefined;
      const request = new AbortController();
      controller = request;
      if (motion.matches) {
        setStatus('reduced');
        return;
      }
      setStatus('loading');
      try {
        const {mount} = await import('./viewer');
        if (request.signal.aborted || !canvas) return;
        const viewer = await mount(canvas, () => choice.current, request.signal, () => setStatus('unavailable'));
        if (request.signal.aborted) { viewer.dispose(); return; }
        dispose = viewer.dispose;
        refresh.current = viewer.refresh;
        setStatus('ready');
      } catch {
        if (!request.signal.aborted) setStatus('unavailable');
      }
    }
    void load();
    motion.addEventListener('change', load);
    return () => { controller.abort(); dispose?.(); refresh.current = undefined; motion.removeEventListener('change', load); };
  }, []);

  return <article className={styles.study}>
    <h1>Clay portrait study<span>.</span></h1>
    <p>Move your pointer near the portrait or scroll on your phone. Choose a pose to hold the head still.</p>
    <div className={styles.comparison}>
      <section aria-labelledby="model-heading">
        <h2 id="model-heading">Blender head</h2>
        <Link href="?profile=open" scroll={false} aria-label="Open Mark Whitley's profile" className={styles.circle}>
          <Image src={artwork} alt="" fill unoptimized priority/>
          <canvas ref={surface} className={status === 'ready' ? styles.ready : undefined} aria-hidden="true"/>
        </Link>
        <div className={styles.controls} role="group" aria-label="Portrait pose">
          {choices.map(value => <button key={value} type="button" disabled={status !== 'ready'}
            aria-pressed={pose === value} onClick={() => { choice.current = value; setPose(value); refresh.current?.(); }}>{value}</button>)}
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
