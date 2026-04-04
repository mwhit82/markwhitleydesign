import { ArrowUpRight01Icon, Linkedin01Icon, Mail02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";

export const metadata = {
  title: "Contact | Mark Whitley",
};

const socialLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/mark-whitley-/", icon: Linkedin01Icon },
  { label: "X / Twitter", href: "#", icon: ArrowUpRight01Icon },
  { label: "Dribbble", href: "#", icon: ArrowUpRight01Icon },
];

export default function ContactPage() {
  return (
    <div className="space-y-10 pb-24 pt-8 md:pt-14">
      <SectionHeading
        eyebrow="Contact"
        title="Let’s talk about product design engineering, AI, and building better experiences."
        description="If you are working on a product that needs design leadership, interface craft, or a sharper AI experience, I would love to hear about it."
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] md:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Email
          </p>
          <a
            href="mailto:hello@markwhitley.design"
            className="mt-4 inline-flex items-center gap-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--accent)] md:text-3xl"
          >
            <Icon icon={Mail02Icon} size={24} />
            hello@markwhitley.design
          </a>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Prefer LinkedIn? That works too. This page is set up to be simple,
            direct, and easy to expand later if you want to add a contact form.
          </p>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Social Links
          </p>
          <div className="mt-5 grid gap-3">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-4 text-sm font-medium hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
              >
                <span className="inline-flex items-center gap-3">
                  <Icon icon={link.icon} size={18} />
                  {link.label}
                </span>
                <Icon icon={ArrowUpRight01Icon} size={18} />
              </a>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
