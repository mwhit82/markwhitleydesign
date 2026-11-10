import Link from 'next/link';
import {WireframeArt,wireframeKinds} from './wireframe-art';
import {Icon} from './icon';
import {ArrowUpRight01Icon} from '@hugeicons/core-free-icons';
import type {PortfolioTile as Tile} from '@/data/portfolio';
import styles from '@/app/portfolio.module.css';
export function PortfolioTile({project}:{project:Tile;index?:number}){
 const content=<><div className={`${styles.productArt} wireframeSurface`}><WireframeArt kind={project.wireframe || wireframeKinds[project.slug] || 'prototype'}/><span className={styles.conceptLabel}>Illustrative wireframe</span></div><div className={styles.cardFooter}><div><h3>{project.title}</h3><p>{project.description}</p></div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} size={18}/></span></div></>;
 return project.external?<a className={styles.card} data-build-card href={project.href} target="_blank" rel="noopener noreferrer">{content}</a>:<Link className={styles.card} data-build-card href={project.href}>{content}</Link>;
}
