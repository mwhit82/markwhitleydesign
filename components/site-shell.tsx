"use client";
import { navigation } from "@/components/site-navigation";
import { portfolioStudies } from "@/data/portfolio";
import {usePathname} from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight01Icon,
  Linkedin01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";


export function SiteShell({ children }: { children: ReactNode }) {
  const pathname=usePathname();
  if(pathname==='/playground/hallowseve26'||pathname==='/playground/the-anomalous'||pathname==='/playground/dead-deadly-deader'||pathname==='/playground/rally'||pathname==='/playground/soccer98'||portfolioStudies.some(study=>pathname===`/work/${study.slug}`)||pathname==='/photography'||pathname==='/playground/pocket-racers-vr')return <main>{children}</main>;
  if(pathname==='/')return <div style={{minHeight:'100dvh',background:'#f2f0e9',color:'#252621'}}><main>{children}</main></div>;
  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-50 mx-auto mb-6 mt-4 max-w-7xl rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-3 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex items-center justify-between gap-6">
          <LogoMark />
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
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
        <nav aria-label="Main navigation" className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
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

      <Link
        href="/playground/rally"
        className="mb-6 flex items-center justify-between rounded-xl bg-[#d95131] px-5 py-3 text-sm font-semibold text-[#fff3de]"
      >
        <span>
          POCKET RALLY · A tiny car. A forest stage. Your next best time.
        </span>
        <span aria-hidden="true">Play <span aria-hidden="true" className="inline-block align-middle"><Icon icon={ArrowUpRight01Icon} size={16} /></span></span>
      </Link>
      <main>{children}</main>

      <footer className="mt-12 border-t border-[color:var(--border)] py-8 text-sm text-[color:var(--muted)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>
            Mark Whitley. Product design engineering, AI experiences, and
            premium interfaces.
          </p>
          <div className="flex gap-5">
            <Link
              href="https://www.linkedin.com/in/mark-whitley-/"
              className="inline-flex items-center gap-2"
            >
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
