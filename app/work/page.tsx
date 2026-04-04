import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { projects } from "@/data/projects";

export const metadata = {
  title: "Work | Mark Whitley",
};

export default function WorkPage() {
  return (
    <div className="space-y-10 pb-24 pt-8 md:pt-14">
      <SectionHeading
        eyebrow="Work"
        title="Case studies built around product outcomes, design systems, and AI-powered workflows."
        description="Each project card is ready to link through to a deeper case study page as the portfolio evolves."
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <ProjectCard key={project.slug} project={project} priority={index < 2} />
        ))}
      </div>
    </div>
  );
}
