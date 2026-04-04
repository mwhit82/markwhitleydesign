import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { BadgeList } from "@/components/badge-list";
import { Icon } from "@/components/icon";
import type { Project } from "@/data/projects";

export function ProjectCard({
  project,
}: {
  project: Project;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group flex h-full flex-col justify-between rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] hover:-translate-y-1 hover:border-[color:var(--accent)]"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
            {project.category}
          </p>
          <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--accent)]">
            {project.year}
          </span>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">{project.title}</h3>
          <p className="text-sm leading-7 text-[color:var(--muted)]">{project.description}</p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <BadgeList items={project.tags} />
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]">
          View case study
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            <Icon icon={ArrowRight01Icon} size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
