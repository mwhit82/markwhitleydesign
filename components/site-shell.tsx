import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight01Icon, Linkedin01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/playground", label: "Playground" },
  { href: "/contact", label: "Contact" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-50 mx-auto mb-6 mt-4 max-w-7xl rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-3 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex items-center justify-between gap-6">
          <LogoMark />
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] md:inline-flex"
            >
              <Icon icon={SparklesIcon} size={16} />
              Get in Touch
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-2 text-sm text-[color:var(--muted)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="mt-12 border-t border-[color:var(--border)] py-8 text-sm text-[color:var(--muted)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>Mark Whitley. Product design engineering, AI experiences, and premium interfaces.</p>
          <div className="flex gap-5">
            <Link href="https://www.linkedin.com/in/mark-whitley-/" className="inline-flex items-center gap-2">
              <Icon icon={Linkedin01Icon} size={18} />
              LinkedIn
            </Link>
            <Link href="/playground" className="inline-flex items-center gap-2">
              <Icon icon={ArrowUpRight01Icon} size={18} />
              Playground
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
