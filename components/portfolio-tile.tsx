import Link from 'next/link';
import Image from 'next/image';
import type {PortfolioTile as Tile} from '@/data/portfolio';
import styles from '@/app/portfolio.module.css';
export function PortfolioTile({project}:{project:Tile;index?:number}){
 const content=<><div className={styles.productArt}>{project.tone==='sale'?<Image src="/portfolio/salecycle-logo.svg" alt="SaleCycle" fill className={styles.saleLogo} sizes="(max-width:639px) 100vw, 25vw"/>:project.image?<Image src={project.image} alt={project.alt||project.title} fill sizes="(max-width:639px) 100vw, (max-width:1023px) 50vw, (max-width:1279px) 33vw, 25vw"/>:<div className={styles.fallbackArt} aria-hidden="true"><svg viewBox="0 0 120 90" fill="none" stroke="currentColor"><rect x="10" y="12" width="100" height="66" rx="6"/><path d="M10 28h100M35 28v50M45 40h48M45 50h24M45 60h36"/><circle cx="20" cy="20" r="2"/></svg></div>}{project.conceptual&&<span className={styles.conceptLabel}>Concept illustration</span>}</div><div className={styles.cardFooter}><div><h3>{project.title}</h3><p>{project.description}</p></div><span aria-hidden="true">↗</span></div></>;
 return project.external?<a className={styles.card} data-build-card href={project.href} target="_blank" rel="noopener noreferrer">{content}</a>:<Link className={styles.card} data-build-card href={project.href}>{content}</Link>;
}
