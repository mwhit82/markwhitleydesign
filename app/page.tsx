import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import Image from "next/image";
import { PortfolioTile } from "@/components/portfolio-tile";
import { GameCard } from "@/components/game-card";
import { PhotographyPreview } from "@/components/photography/preview";
import { SiteNavigation } from "@/components/site-navigation";
import { portfolioTiles } from "@/data/portfolio";
import { games } from "@/data/games";
import styles from "./portfolio.module.css";
export default function HomePage() {
  return <div className={styles.home}>
    <SiteNavigation/>
    <header className={styles.profile}><div><p className={styles.kicker}>Mark Whitley / Selected work</p><h1>Products, systems.<br/>A little play.</h1></div><aside className={styles.contactCard} aria-label="About Mark"><div className={styles.avatar}><Image src="/portfolio/mark-whitley.jpg" alt="Mark Whitley" width={112} height={112} priority /></div><div><strong>Mark Whitley</strong><p>Senior Staff Product Design Engineer at Pendo.</p><p>I design products, build systems and experiment with AI.</p><a href="https://www.linkedin.com/in/mark-whitley-/" target="_blank" rel="noreferrer">Connect on LinkedIn <Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></a></div></aside></header>
    <section id="portfolio" aria-labelledby="portfolio-heading"><h2 id="portfolio-heading" className={styles.categoryTitle}>Portfolio</h2><div className={styles.grid}>{portfolioTiles.map((project,index) => <PortfolioTile key={project.slug} project={project} index={index}/>)}</div></section>
    <section id="gaming" aria-labelledby="gaming-heading" className={styles.homeSection}><h2 id="gaming-heading" className={styles.categoryTitle}>Gaming</h2><div className={styles.grid}>{games.map((game,index) => <GameCard key={game.slug} game={game} index={index}/>)}</div></section>
    <PhotographyPreview/>
  </div>;
}
