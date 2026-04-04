import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external = false,
}: ButtonLinkProps) {
  const className =
    variant === "primary"
      ? "border border-[color:var(--accent)] bg-[color:var(--accent)] text-[#fffaf6] hover:-translate-y-0.5 hover:brightness-[1.03] shadow-[0_18px_40px_rgba(235,106,47,0.24)] dark:text-[#1c130d]"
      : "border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--foreground)] hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-[var(--shadow)] ${className}`}
    >
      <span className="whitespace-nowrap">{children}</span>
      <span className="shrink-0">
        <Icon icon={external ? ArrowUpRight01Icon : ArrowRight01Icon} size={18} />
      </span>
    </Link>
  );
}
