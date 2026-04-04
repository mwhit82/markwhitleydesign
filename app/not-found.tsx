import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-6">
      <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent)]">
        404
      </p>
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-[-0.04em]">
          Page not found
        </h1>
        <p className="max-w-xl text-sm leading-7 text-[color:var(--muted)]">
          The page you were looking for is not here yet. The portfolio is still growing.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold"
      >
        Back home
      </Link>
    </div>
  );
}
