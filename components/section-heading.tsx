type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--accent)]">
        {eyebrow}
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight tracking-[-0.04em] text-balance md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-8 text-[color:var(--muted)] md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
