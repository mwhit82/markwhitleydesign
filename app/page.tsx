import { AiIdeaIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { projects } from "@/data/projects";
import { experiments } from "@/data/experiments";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icon";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";

export default function HomePage() {
  const featuredProjects = projects.slice(0, 3);
  const featuredExperiments = experiments.slice(0, 2);

  return (
    <div className="space-y-24 pb-24 pt-8 md:space-y-32 md:pt-14">
      <section className="fade-up grid gap-10 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-8 shadow-[var(--shadow)] backdrop-blur md:grid-cols-[1.25fr_0.75fr] md:px-10 md:py-12">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[color:var(--muted)]">
            <span className="mr-2 text-[color:var(--accent)]">
              <Icon icon={SparklesIcon} size={16} />
            </span>
            Snr Staff Product Design Engineer @ Pendo building AI-powered experiences
          </div>
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Mark Whitley
            </p>
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-none tracking-[-0.04em] text-balance md:text-7xl">
              Designing product experiences that feel calm, clear, and a little bit inevitable.
            </h1>
          </div>
          <p className="max-w-2xl text-base leading-8 text-[color:var(--muted)] md:text-lg">
            I design end-to-end product systems with a focus on AI-powered workflows,
            thoughtful UX, and the kind of visual polish that helps complex tools feel
            intuitive. My work sits at the intersection of product strategy, interaction
            design, prototyping, and experimentation.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/work">View Work</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Get in Touch
            </ButtonLink>
          </div>
        </div>
        <div className="fade-up fade-up-delay-1 grid gap-4 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
          <div className="grid gap-2 border-b border-[color:var(--border)] pb-4">
            <p className="text-sm text-[color:var(--muted)]">Currently focused on</p>
            <p className="text-xl font-semibold tracking-[-0.03em]">
              Product design leadership, AI experiences, and high-craft interface systems.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Discipline", "Product Design Engineering"],
              ["Specialty", "AI + UX"],
              ["Approach", "Prototype early"],
              ["Location", "Open to global work"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Selected Work"
          title="Product thinking, systems craft, and AI experimentation in one portfolio."
          description="A modular project grid with room to grow into deeper case studies."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredProjects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} priority={index < 2} />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="fade-up fade-up-delay-1 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)]">
          <SectionHeading
            eyebrow="About"
            title="A design practice shaped by product clarity."
            description="I care about simplifying complexity, building trust through interface quality, and using AI in ways that amplify human judgment."
          />
          <Link
            href="/about"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]"
          >
            <Icon icon={AiIdeaIcon} size={18} />
            More about my process
          </Link>
        </div>
        <div className="fade-up fade-up-delay-2 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Systems Thinking",
              copy: "Balancing user needs, business constraints, and product architecture.",
            },
            {
              title: "AI-Native UX",
              copy: "Designing interfaces where intelligence feels useful, legible, and safe.",
            },
            {
              title: "Prototyping",
              copy: "Using motion and interaction to make product direction tangible early.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)]"
            >
              <h3 className="text-lg font-semibold tracking-[-0.03em]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Playground"
          title="Experiments exploring how AI can change the shape of product design."
          description="A place for prototypes, speculative ideas, and rough edges with promise."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {featuredExperiments.map((experiment, index) => (
            <article
              key={experiment.title}
              className={`fade-up rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] ${index === 1 ? "fade-up-delay-1" : ""}`}
            >
              <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent)]">
                {experiment.status}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                {experiment.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
                {experiment.description}
              </p>
            </article>
          ))}
        </div>
        <ButtonLink href="/playground" variant="secondary">
          Explore Experiments
        </ButtonLink>
      </section>

      <section className="fade-up fade-up-delay-3 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-8 shadow-[var(--shadow)] md:px-10">
        <SectionHeading
          eyebrow="Contact"
          title="Open to conversations about product design engineering, AI, and thoughtful collaboration."
          description="Whether you are building a new product, refining an existing system, or exploring AI-enabled workflows, I am always interested in good problems."
        />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="mailto:hello@markwhitley.design">Email Mark</ButtonLink>
          <ButtonLink
            href="https://www.linkedin.com/in/mark-whitley-/"
            variant="secondary"
            external
          >
            LinkedIn
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
