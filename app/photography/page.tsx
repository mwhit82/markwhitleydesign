import type { Metadata } from "next";
import Link from "next/link";
import { SiteNavigation } from "@/components/site-navigation";
import { PhotographyGallery } from "@/components/photography/gallery";
import { photographs, hasPlaceholders } from "@/data/photography";
import styles from "@/components/photography/photography.module.css";
const description=hasPlaceholders ? 'An editorial gallery preview. Original photography by Mark Whitley coming soon; preview images credited to their Unsplash photographers.' : 'Selected photographs by Mark Whitley. A collection of moments, places and perspectives.';
export const metadata: Metadata = {
  title:'Photography | Mark Whitley',description,
  alternates:{canonical:'https://markwhitley.design/photography'},
  openGraph:{title:'Photography | Mark Whitley',description,url:'https://markwhitley.design/photography',type:'website',images:[{url:photographs[0].src,width:photographs[0].width,height:photographs[0].height,alt:photographs[0].alt}]},
  twitter:{card:'summary_large_image',title:'Photography | Mark Whitley',description,images:[photographs[0].src]},
};
export default function PhotographyPage() {
  return <div className={styles.exhibition}><div className={styles.galleryNav}><Link href="/" className={styles.signature}>Mark Whitley<span>DESIGNER & OBSERVER</span></Link><SiteNavigation/></div><header className={styles.galleryHeader}><p className={styles.eyebrow}>MOMENTS / PLACES / PERSPECTIVES</p><h1>Photography<span aria-hidden="true">.</span></h1><div className={styles.heroSubline}><p>{hasPlaceholders?'Selected photography — gallery preview':'Selected photographs by Mark Whitley'}</p><a href="#selected-photographs">Scroll to explore ↓</a></div>{hasPlaceholders && <p className={styles.previewNotice}>Gallery preview — original photography coming soon</p>}</header><PhotographyGallery photos={photographs}/><footer className={styles.galleryFooter}><span className={styles.eyebrow}>THANK YOU FOR LOOKING</span><h2>There’s always<br/><em>more to see.</em></h2><Link href="/">Return to markwhitley.design ↗</Link><span className={styles.footerSignature}>Mark Whitley / Photography</span></footer></div>;
}
