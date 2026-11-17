"use client";

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight01Icon, RefreshIcon} from '@hugeicons/core-free-icons';
import {Icon} from './icon';
import styles from './design-intro.module.css';

const portraits = [
  {label: 'Photo', src: '/portfolio/mark-whitley.jpg'},
  {label: 'Clay', src: '/portfolio/avatars/mark-clay.webp'},
  {label: 'Ink', src: '/portfolio/avatars/mark-ink.webp'},
  {label: 'Pixel', src: '/portfolio/avatars/mark-pixel.webp'},
];

export function DesignIntro({ready, initialEntrance}: {ready: boolean; initialEntrance: boolean}) {
  const [animateEntrance] = useState(initialEntrance);
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState<number[]>([0]);
  const [failed, setFailed] = useState<number[]>([]);
  const [manual, setManual] = useState(false);
  const [deferImages, setDeferImages] = useState(false);
  const root = useRef<HTMLElement>(null);
  const portrait = useRef<HTMLAnchorElement>(null);
  const played = useRef(false);

  useEffect(() => { if (ready) setDeferImages(true); }, [ready]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let step = 0;
    const resetTilt = () => { portrait.current?.style.removeProperty('transform'); };
    const stop = () => { clearInterval(timer); timer = undefined; resetTilt(); };
    const blocked = () => reduced.matches || document.hidden || !visible || !!document.querySelector('dialog[open]');
    const sync = () => {
      if (blocked() || !ready || manual) { stop(); return; }
      if (!played.current && loaded.length + failed.length === portraits.length) {
        played.current = true;
        timer = setInterval(() => {
          step++;
          if (step >= portraits.length) { setSelected(0); stop(); }
          else setSelected(failed.includes(step) ? 0 : step);
        }, 850);
      }
    };
    const move = (event: PointerEvent) => {
      if (!fine.matches || blocked() || !portrait.current) return;
      const bounds = portrait.current.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX-bounds.left)/bounds.width-.5)*2));
      const y = Math.max(-1, Math.min(1, ((event.clientY-bounds.top)/bounds.height-.5)*2));
      portrait.current.style.transform = `perspective(700px) rotateX(${-y*3}deg) rotateY(${x*3}deg)`;
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: .2});
    observer.observe(element);
    const dialogs = new MutationObserver(sync);
    dialogs.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    const target = portrait.current;
    target?.addEventListener('pointermove', move);
    target?.addEventListener('pointerleave', resetTilt);
    return () => { stop(); observer.disconnect(); dialogs.disconnect(); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); target?.removeEventListener('pointermove', move); target?.removeEventListener('pointerleave', resetTilt); };
  }, [ready, manual, loaded, failed]);

  const choose = (index: number) => { setManual(true); setSelected(index); };
  const active = loaded.includes(selected) && !failed.includes(selected) ? selected : 0;
  const available = portraits.map((_, index) => index).filter(index => !failed.includes(index));
  return <section ref={root} className={`${styles.hero} ${animateEntrance ? styles.enter : ''}`} aria-labelledby="design-intro-title">
    <div className={styles.words}>
      <h1 id="design-intro-title">Mark Whitley<span className={styles.fullStop}>.</span></h1>
      <p className={styles.tagline}>Twenty years designing.<br/><span>Still making things that make people smile.</span></p>
      <div className={styles.bio}>
        <p>I’m a product designer at <a href="https://www.pendo.io/">Pendo.io</a>, previously at SaleCycle and Leighton. I use AI to turn ideas into working experiences, both on the job and in my own experiments.</p>
        <p>Creativity rarely clocks off. Away from work, I build VR games, chase photographs and follow whatever sparks my curiosity. You’ll find a little of all of it here.</p>
      </div>
      <nav className={styles.links} aria-label="Explore my work and interests">
        <a href="#selected-design">Explore my work <Icon icon={ArrowUpRight01Icon} size={16}/></a>
        <Link href="/?view=games">Play my games <Icon icon={ArrowUpRight01Icon} size={16}/></Link>
        <Link href="/?view=photography">See my photography <Icon icon={ArrowUpRight01Icon} size={16}/></Link>
      </nav>
    </div>
    <div className={styles.studio}>
      <Link ref={portrait} href="/?view=design&profile=open" scroll={false} className={styles.portrait} aria-label="Open Mark Whitley's profile">
        {portraits.map((item, index) => (index === 0 || deferImages) && <Image key={item.label} src={item.src} alt={index === 0 ? 'Mark Whitley, smiling' : ''} fill sizes="(max-width: 639px) 192px, (max-width: 1023px) 240px, 300px" priority={index === 0} loading={index === 0 ? undefined : 'eager'} className={`${styles.image} ${active === index ? styles.visible : ''} ${index === 0 ? styles.original : ''}`} onLoad={() => setLoaded(current => current.includes(index) ? current : [...current, index])} onError={() => setFailed(current => current.includes(index) ? current : [...current, index])}/>)}
      </Link>
      <div className={styles.controls} role="group" aria-label="Portrait style">
        {portraits.map((item, index) => <button key={item.label} aria-pressed={active === index} disabled={failed.includes(index)} onClick={() => choose(index)}>{item.label}</button>)}
      </div>
      <button className={styles.remix} onClick={() => choose(available[(available.indexOf(active)+1)%available.length])}><Icon icon={RefreshIcon} size={15}/> Remix me</button>
      <p className={styles.caption}>Same me. Different medium.</p>
    </div>
  </section>;
}
