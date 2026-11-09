import Link from "next/link";
import { PhotoImage } from "./photo-image";
import { featuredPhotographs } from "@/data/photography";
import { PhotoCredit } from "./credit";
import { Reveal } from "./reveal";
import styles from "./photography.module.css";
export function PhotographyPreview() {
  return <section id="photography" className={styles.preview} aria-labelledby="photography-heading"><header className={styles.previewHeader}><div><span className={styles.eyebrow}>03 / THROUGH THE LENS</span><h2 id="photography-heading">Photography</h2></div><p>A collection of moments, places and perspectives through my lens.</p></header>
    {featuredPhotographs.some(photo=>photo.placeholder) && <p className={styles.previewNotice}>Gallery preview — original photography coming soon</p>}
    <div className={styles.printWall}>{featuredPhotographs.map((photo,index)=><Reveal key={photo.id} className={styles.printItem}><figure><Link href={`/photography#photo-${photo.id}`} className={styles.print} aria-label={`Explore photography: ${photo.title || photo.alt}`}><PhotoImage photo={photo} sizes="(max-width:600px) 90vw, (max-width:1000px) 44vw, 28vw"/></Link><figcaption><span>{String(index+1).padStart(2,'0')} / {photo.title || 'Untitled'}</span><PhotoCredit photo={photo}/></figcaption></figure></Reveal>)}</div>
    <Link href="/photography" className={styles.explore}>Explore photography <span aria-hidden="true">→</span></Link>
  </section>;
}
