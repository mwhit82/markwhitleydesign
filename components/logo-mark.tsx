import Link from "next/link";

export function LogoMark() {
  return (
    <Link
      href="/"
      aria-label="Mark Whitley home"
      className="group inline-flex shrink-0 items-center gap-3 rounded-full px-1 py-1 no-underline"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] shadow-[var(--shadow)]">
        <svg
          viewBox="0 0 64 64"
          width="28"
          height="28"
          className="block h-7 w-7 shrink-0"
          style={{ color: "var(--foreground)" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 47V18L22.8 38.4L35.6 18V47"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M38 18L47.5 47L57 18"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="51.5" cy="18" r="3.5" fill="currentColor" />
        </svg>
      </span>
      <span className="hidden md:block">
        <span className="block text-sm font-semibold tracking-[0.18em] text-[color:var(--foreground)]">
          MARK WHITLEY
        </span>
        <span className="block text-xs tracking-[0.16em] text-[color:var(--muted)]">
          Product Design Engineer
        </span>
      </span>
    </Link>
  );
}
