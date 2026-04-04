import { BadgeList } from "@/components/badge-list";
import { SectionHeading } from "@/components/section-heading";
import { experiments } from "@/data/experiments";

export const metadata = {
  title: "Playground | Mark Whitley",
};

export default function PlaygroundPage() {
  return (
    <div className="space-y-10 pb-24 pt-8 md:pt-14">
      <SectionHeading
        eyebrow="Playground"
        title="A home for experiments, speculative concepts, and AI-native design ideas."
        description="This section is intentionally lighter and faster than a formal case study. It is where new interaction patterns can be tested before they become product decisions."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {experiments.map((experiment) => (
          <article
            key={experiment.title}
            className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)]"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent)]">
              {experiment.status}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {experiment.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
              {experiment.description}
            </p>
            <div className="mt-5">
              <BadgeList items={experiment.tags} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
