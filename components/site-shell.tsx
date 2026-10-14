"use client";
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

const navigation = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/playground", label: "Playground" },
  { href: "/contact", label: "Contact" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname=usePathname();
  if(pathname==='/playground/rally'||['pendo-for-agents','salecycle-design-system','leo','pendo-listen'].some(slug=>pathname===`/work/${slug}`))return <main>{children}</main>;
  if(pathname==='/')return <div style={{minHeight:'100dvh',background:'#f2f0e9',color:'#252621'}}><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px clamp(20px,4vw,64px)',maxWidth:1440,margin:'auto',fontSize:13}}><Link href="/" style={{fontWeight:700}}>MW.</Link><nav style={{display:'flex',gap:24}}><Link href="/contact">Contact <span aria-hidden="true" className="inline-block align-middle"><Icon icon={ArrowUpRight01Icon} size={16} /></span></Link></nav></header><main>{children}</main></div>;
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
