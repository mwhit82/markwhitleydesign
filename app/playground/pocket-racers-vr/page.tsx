import Link from "next/link";
import {Icon} from '@/components/icon';
import {ArrowUpRight01Icon,ArrowRight01Icon} from '@hugeicons/core-free-icons';
import Image from "next/image";
import { pocketRacers } from "@/data/games";
import styles from "@/app/portfolio.module.css";
export const metadata = {title:'Pocket Racers VR | Mark Whitley',description:pocketRacers.description};
export default function PocketRacersPage() {
  return <article className={styles.study}><header className={styles.studyHero}><p className={styles.kicker}>{pocketRacers.category}</p><h1>Pocket Racers VR</h1><p>{pocketRacers.description}</p></header><figure className={styles.gameConcept}><Image src={pocketRacers.image!} alt={pocketRacers.alt!} width={1200} height={800} sizes="(max-width:700px) 100vw, 80vw"/><figcaption>Concept illustration — a little preview of the idea.</figcaption></figure><section className={styles.studyNote}><div><h2>{pocketRacers.metaStoreUrl ? 'Discover Pocket Racers VR' : 'Meta Quest — Coming soon'}</h2><p>A miniature racing world, right in your room.</p></div>{pocketRacers.metaStoreUrl ? <a href={pocketRacers.metaStoreUrl} target="_blank" rel="noopener noreferrer">View on Meta Horizon Store <Icon icon={ArrowUpRight01Icon} size={18}/></a> : <Link href="/?view=games">Explore more games <Icon icon={ArrowRight01Icon} size={18}/></Link>}</section></article>;
}
