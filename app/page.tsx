import Link from "next/link";
import Image from "next/image";
import styles from "./portfolio.module.css";

export default function HomePage() {
  return <div className={styles.home}>
    <header className={styles.profile}><div><p className={styles.kicker}>Mark Whitley / Selected work</p><h1>Products, systems.<br/>A little play.</h1></div><aside className={styles.contactCard} aria-label="About Mark"><div className={styles.avatar} aria-label="Mark Whitley avatar placeholder">MW</div><div><strong>Mark Whitley</strong><p>Senior Staff Product Design Engineer at Pendo.</p><p>I design products, build systems and experiment with AI.</p><a href="https://www.linkedin.com/in/mark-whitley-/" target="_blank" rel="noreferrer">Connect on LinkedIn ↗</a></div></aside></header>
    <h2 className={styles.categoryTitle}>My portfolio <span>04</span></h2>
    <section className={styles.grid} aria-label="My portfolio">
      <Link href="/work/pendo-for-agents" className={`${styles.card} ${styles.pendo}`}><div className={styles.pendoArt} aria-hidden="true"><span className={styles.wordmark}>pendo<span>●</span></span><div className={styles.agentOrbit}><i>Context</i><b>✳</b><i>Action</i></div><span className={styles.artCaption}>Better context. Better agents.</span></div><div className={styles.cardFooter}><div><small>01 / Product design</small><h2>Pendo for Agents</h2></div><span aria-hidden="true">↗</span></div></Link>

      <Link href="/work/salecycle-design-system" className={`${styles.card} ${styles.sale}`}><div className={styles.systemArt} aria-hidden="true"><span className={styles.wordmark}>SaleCycle</span><div className={styles.swatches}><i/><i/><i/><i/></div><div className={styles.typeSample}>Aa<span>Design<br/>in every detail.</span></div><span className={styles.artCaption}>A shared design language.</span></div><div className={styles.cardFooter}><div><small>02 / Design system · Case study coming soon</small><h2>SaleCycle design system</h2></div><span aria-hidden="true">↗</span></div></Link>
      <Link href="/work/leo" className={`${styles.card} ${styles.leo}`}><div className={styles.leoArt} aria-hidden="true"><span className={styles.wordmark}>pendo</span><strong>Leo<span>✳</span></strong><span className={styles.artCaption}>Intelligence, inside the product.</span></div><div className={styles.cardFooter}><div><small>03 / AI assistant</small><h2>Leo</h2></div><span aria-hidden="true">↗</span></div></Link>
      <Link href="/work/pendo-listen" className={`${styles.card} ${styles.listen}`}><div className={styles.listenArt} aria-hidden="true"><span className={styles.wordmark}>pendo</span><strong>Less noise.<br/><span>More signal.</span></strong><span className={styles.artCaption}>Customer feedback. Product direction.</span></div><div className={styles.cardFooter}><div><small>04 / Product design</small><h2>Pendo Listen</h2></div><span aria-hidden="true">↗</span></div></Link>
    </section>
    <h2 className={styles.categoryTitle}>AI experiments <span>01</span></h2>
    <section className={styles.grid} aria-label="AI experiments">
      <Link href="/playground/rally" className={`${styles.card} ${styles.rally}`} prefetch={false}><div className={styles.rallyArt}><Image src="/rally/previews/v42/forest-1-weather-clear.webp" alt="Handmade miniature forest rally course" fill sizes="(max-width: 700px) 100vw, 50vw" priority/><span className={styles.playBadge}>PLAY ↗</span><strong>POCKET<br/>RALLY.</strong></div><div className={styles.cardFooter}><div><small>01 / Playable experiment</small><h2>Pocket Rally</h2></div><span aria-hidden="true">↗</span></div></Link>
    </section>
  </div>;
}
