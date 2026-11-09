import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import type { PortfolioTile as Tile } from "@/data/portfolio";
import styles from "@/app/portfolio.module.css";

export function PortfolioTile({project, index = 0}: {project: Tile; index?: number}) {
  const content = <>
    {project.tone === 'sale' ? <div className={styles.systemArt}><Image src="/portfolio/salecycle-logo.svg" alt="SaleCycle" width={360} height={45} className={styles.saleLogo}/><div className={styles.systemModules} aria-hidden="true"><span>Aa</span><span><i/><i/><i/></span><span><Icon icon={ArrowUpRight01Icon}/></span></div><span className={styles.artCaption}>A shared design language.</span></div> :
    <div className={`${styles.productArt} ${styles[`${project.tone}Art`] || ''}`}>
      {project.image && <Image src={project.image} alt={project.alt || project.title} fill sizes="(max-width: 700px) 100vw, (max-width: 1440px) 50vw, 650px"/>}
      {project.conceptual && <span className={styles.conceptLabel}>Concept illustration</span>}
    </div>}
    <div className={styles.cardFooter}><div><small>{String(index + 1).padStart(2,'0')} / {project.category}</small><h3>{project.title}</h3>{project.conceptual && <p>{project.description}</p>}</div><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow}/></div>
  </>;
  const className = `${styles.card} ${styles[project.tone] || ''}`;
  return project.external ? <a href={project.href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a> : <Link href={project.href} className={className}>{content}</Link>;
}
