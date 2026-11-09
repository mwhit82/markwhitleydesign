import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { gameDestination, type Game } from "@/data/games";
import styles from "@/app/portfolio.module.css";
export function GameCard({game,index = 0,showDescription = false}: {game:Game;index?:number;showDescription?:boolean}) {
  const content = <><div className={`${styles.rallyArt} ${styles[`${game.tone}Art`] || ''}`}>
    {game.image && <Image src={game.image} alt={game.alt || game.title} fill sizes="(max-width: 700px) 100vw, (max-width: 1440px) 50vw, 650px"/>}
    <span className={styles.playBadge}>{game.comingSoon ? (game.metaStoreUrl ? 'META QUEST' : 'COMING SOON') : 'PLAY'} <Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow}/></span>
    <strong aria-hidden="true">{game.artTitle}</strong>
  </div><div className={styles.cardFooter}><div><small>{String(index+1).padStart(2,'0')} / {game.category}</small><h3>{game.title}</h3>{game.comingSoon && !game.metaStoreUrl && <p>Meta Quest — Coming soon</p>}{(showDescription || game.comingSoon) && <p>{game.description}</p>}</div><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow}/></div></>;
  const className = `${styles.card} ${styles[game.tone]}`;
  return game.metaStoreUrl ? <a href={gameDestination(game)} target="_blank" rel="noopener noreferrer" className={className}>{content}</a> : <Link href={gameDestination(game)} prefetch={false} className={className}>{content}</Link>;
}
