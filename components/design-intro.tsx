"use client";

import Link from 'next/link';
import {useState} from 'react';
import {ArrowUpRight01Icon} from '@hugeicons/core-free-icons';
import {Icon} from './icon';
import styles from './design-intro.module.css';
import {ClayPortrait} from './clay-portrait';

export function DesignIntro({ready, initialEntrance}: {ready: boolean; initialEntrance: boolean}) {
  const [animateEntrance] = useState(initialEntrance);
  return <section className={`${styles.hero} ${animateEntrance ? styles.enter : ''}`} aria-labelledby="design-intro-title">
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
    <div className={styles.studio}><ClayPortrait ready={ready}/></div>
  </section>;
}
