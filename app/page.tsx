import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import Link from "next/link";
import Image from "next/image";
import styles from "./portfolio.module.css";

export default function HomePage() {
  return <div className={styles.home}>
    <header className={styles.profile}><div><p className={styles.kicker}>Mark Whitley / Selected work</p><h1>Products, systems.<br/>A little play.</h1></div><aside className={styles.contactCard} aria-label="About Mark"><div className={styles.avatar}><Image src="/portfolio/mark-whitley.jpg" alt="Mark Whitley" width={112} height={112} priority /></div><div><strong>Mark Whitley</strong><p>Senior Staff Product Design Engineer at Pendo.</p><p>I design products, build systems and experiment with AI.</p><a href="https://www.linkedin.com/in/mark-whitley-/" target="_blank" rel="noreferrer">Connect on LinkedIn <Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></a></div></aside></header>
    <h2 className={styles.categoryTitle}>AI experiments</h2>
    <section className={styles.grid} aria-label="AI experiments">
      <Link href="/playground/rally" className={`${styles.card} ${styles.rally}`} prefetch={false}><div className={styles.rallyArt}><Image src="/rally/previews/v42/forest-1-weather-clear.webp" alt="Handmade miniature forest rally course" fill sizes="(max-width: 700px) 100vw, 50vw"/><span className={styles.playBadge}>PLAY <Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span><strong>POCKET<br/>RALLY.</strong></div><div className={styles.cardFooter}><div><small>01 / Playable experiment</small><h2>Pocket Rally</h2></div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span></div></Link>
    </section>
    <h2 className={styles.categoryTitle}>My portfolio</h2>
    <section className={styles.grid} aria-label="My portfolio">
      <Link href="/work/pendo-for-agents" className={`${styles.card} ${styles.pendo}`}><div className={`${styles.productArt} ${styles.pendoArt}`}><Image src="/portfolio/pendo-agents.webp" alt="Pendo for Agents — build agents that deeply understand users" fill sizes="(max-width: 700px) 100vw, (max-width: 1440px) 50vw, 650px" priority /></div><div className={styles.cardFooter}><div><small>01 / Product design</small><h2>Pendo for Agents</h2></div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span></div></Link>

      <Link href="/work/salecycle-design-system" className={`${styles.card} ${styles.sale}`}><div className={styles.systemArt}><Image src="/portfolio/salecycle-logo.svg" alt="SaleCycle" width={360} height={45} className={styles.saleLogo}/><div className={styles.systemModules} aria-hidden="true"><span>Aa</span><span><i/><i/><i/></span><span><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span></div><span className={styles.artCaption}>A shared design language.</span></div><div className={styles.cardFooter}><div><small>02 / Design system · Case study coming soon</small><h2>SaleCycle design system</h2></div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span></div></Link>
      <Link href="/work/leo" className={`${styles.card} ${styles.leo}`}><div className={`${styles.productArt} ${styles.leoArt}`}><Image src="/portfolio/leo.webp" alt="Leo assistant showing skills and product insights in Pendo" fill sizes="(max-width: 700px) 100vw, (max-width: 1440px) 50vw, 650px" /></div><div className={styles.cardFooter}><div><small>03 / AI assistant</small><h2>Leo</h2></div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span></div></Link>
      <Link href="/work/pendo-listen" className={`${styles.card} ${styles.listen}`}><div className={`${styles.productArt} ${styles.listenArt}`}><Image src="/portfolio/listen.webp" alt="Pendo Listen grouping customer feedback about dashboards" fill sizes="(max-width: 700px) 100vw, (max-width: 1440px) 50vw, 650px" /></div><div className={styles.cardFooter}><div><small>04 / Product design</small><h2>Pendo Listen</h2></div><span aria-hidden="true"><Icon icon={ArrowUpRight01Icon} className={styles.inlineArrow} /></span></div></Link>
    </section>
  </div>;
}
