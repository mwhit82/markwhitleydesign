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
      ? "border border-[color:var(--accent)] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)]"
      : "border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-[var(--shadow)] ${className}`}
    >
      <span className="whitespace-nowrap">{children}</span>
      <span className="shrink-0">
        <Icon icon={external ? ArrowUpRight01Icon : ArrowRight01Icon} size={18} />
      </span>
    </Link>
  );
}
