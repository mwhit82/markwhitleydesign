import Link from "next/link";
import {portfolioStudies} from "@/data/portfolio";
import styles from "../../portfolio.module.css";
import { notFound } from "next/navigation";
import { BadgeList } from "@/components/badge-list";
import { ButtonLink } from "@/components/button-link";
import { getProjectBySlug, projects } from "@/data/projects";

type ProjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return [...projects,...portfolioStudies].map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = portfolioStudies.find(p=>p.slug===slug)??getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project Not Found | Mark Whitley",
    };
  }

  return {
    title: `${project.title} | Mark Whitley`,
    description: project.description,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const study=portfolioStudies.find(p=>p.slug===slug);
  if(study)return <article className={styles.study}><nav className={styles.studyNav}><Link href="/">← All projects</Link><span>Mark Whitley</span></nav><header className={styles.studyHero}><p className={styles.kicker}>{study.category}</p><h1>{study.title}</h1><p>{study.description}</p></header><section className={styles.studyNote}><div><h2>Case study coming soon.</h2><p>The story, process and details of my work will be added here.</p></div><a href={study.source} target="_blank" rel="noreferrer">{study.slug==='salecycle-design-system'?'Visit SaleCycle':'Explore the product'} ↗</a></section></article>;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <article className="space-y-10 pb-24 pt-8 md:pt-14">
      <div className="grid gap-8 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-8 shadow-[var(--shadow)] md:grid-cols-[1.2fr_0.8fr] md:px-10">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent)]">
            Case Study
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.04em] md:text-6xl">
            {project.title}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[color:var(--muted)] md:text-lg">
            {project.description}
          </p>
          <BadgeList items={project.tags} />
        </div>
        <div className="grid gap-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
          <Metric label="Role" value={project.role} />
          <Metric label="Focus" value={project.focus} />
          <Metric label="Impact" value={project.impact} />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <CaseStudyBlock
          title="Overview"
          copy={project.overview}
          className="lg:col-span-3"
        />
        <CaseStudyBlock title="Challenge" copy={project.challenge} />
        <CaseStudyBlock title="Approach" copy={project.approach} />
        <CaseStudyBlock title="Outcome" copy={project.outcome} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/work" variant="secondary">
          Back to Work
        </ButtonLink>
        <ButtonLink href="/contact">Start a Conversation</ButtonLink>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}

function CaseStudyBlock({
  title,
  copy,
  className = "",
}: {
  title: string;
  copy: string;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] ${className}`}
    >
      <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{copy}</p>
    </section>
  );
}
