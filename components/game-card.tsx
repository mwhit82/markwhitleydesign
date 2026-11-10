import Link from 'next/link';
import {Icon} from '@/components/icon';
import {ArrowUpRight01Icon} from '@hugeicons/core-free-icons';
import Image from 'next/image';
import {gameDestination,type Game} from '@/data/games';
import styles from '@/app/portfolio.module.css';
export function GameCard({game}:{game:Game;index?:number;showDescription?:boolean}){
 const content=<><div className={styles.rallyArt}>{game.image?<Image src={game.image} alt={game.alt||game.title} fill sizes="(max-width:639px) 100vw, (max-width:1023px) 50vw, (max-width:1279px) 33vw, 25vw"/>:<div className={styles.fallbackArt} aria-hidden="true"><svg viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 75V30h15v-9h14v9h22v-9h14v9h15v45ZM10 75h100M50 75V55a10 10 0 0 1 20 0v20M27 45h10m46 0h10M60 30V8l22 7-22 7"/></svg></div>}{!game.image&&<strong className={styles.gameTitle}>{game.title}</strong>}{game.comingSoon&&<span className={styles.playBadge}>{game.metaStoreUrl?'Meta Quest':'Coming soon'}</span>}</div><div className={styles.cardFooter}><div><h3>{game.title}</h3><p>{game.description}</p>{game.comingSoon&&!game.metaStoreUrl&&<p>Meta Quest — Coming soon</p>}</div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} size={18}/></span></div></>;
 return game.metaStoreUrl?<a className={styles.card} data-build-card href={gameDestination(game)} target="_blank" rel="noopener noreferrer">{content}</a>:<Link className={styles.card} data-build-card href={gameDestination(game)} prefetch={false}>{content}</Link>;
}
