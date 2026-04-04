import { BadgeList } from "@/components/badge-list";
import { SectionHeading } from "@/components/section-heading";

const skills = [
  "Product Design Engineering",
  "AI Product Thinking",
  "UX Strategy",
  "Interaction Design",
  "Design Systems",
  "Rapid Prototyping",
  "User Research",
  "Cross-functional Leadership",
];

const tools = [
  "Figma",
  "ChatGPT",
  "Midjourney",
  "Framer",
  "Notion",
  "Miro",
  "Principle",
  "Vercel",
];

export const metadata = {
  title: "About | Mark Whitley",
};

export default function AboutPage() {
  return (
    <div className="space-y-10 pb-24 pt-8 md:pt-14">
      <SectionHeading
        eyebrow="About"
        title="Designing digital products with equal attention to clarity, utility, and feel."
        description="I am a senior product design engineer focused on shaping AI-powered experiences that are useful in practice, not just impressive in demos. My work blends systems thinking, product strategy, and interface craft."
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] md:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Bio</h2>
          <div className="mt-5 space-y-4 text-sm leading-8 text-[color:var(--muted)] md:text-base">
            <p>
              I care about designing products that reduce friction and increase confidence.
              That usually means asking better questions earlier, prototyping quickly, and
              getting the details right where users feel them most.
            </p>
            <p>
              My approach is rooted in product design engineering, but it extends into facilitation,
              systems work, experimentation, and helping teams translate ambiguity into a
              focused direction. I am especially interested in AI experiences that feel
              legible, trustworthy, and genuinely helpful.
            </p>
            <p>
              The work I enjoy most sits somewhere between product strategy and interface
              craft: turning complex workflows into something elegant, scalable, and human.
            </p>
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Skills</h2>
            <div className="mt-5">
              <BadgeList items={skills} />
            </div>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Tools</h2>
            <div className="mt-5">
              <BadgeList items={tools} />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
