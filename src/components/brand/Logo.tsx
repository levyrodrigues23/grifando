// A lowercase "g" whose tail becomes the violet squiggle that marks a mistake.
// Thick strokes keep it legible at 16px (same drawing as src/app/icon.svg).
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
<g transform="translate(3.25 1)">
        <circle cx="14" cy="10.5" r="6.5" fill="none" stroke="#111111" strokeWidth="4" />
        <path d="M20.5 4v14" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M20.5 18c0 5-2.6 8-5.8 8-3.6 0-4.3-3.6-7.6-3.6-2 0-3.2 1.1-4.1 2.5"
          fill="none"
          stroke="#0007cb"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-[1.3em] w-[1.3em] shrink-0" />
      <span className="font-light tracking-[-0.03em]">Grifando</span>
    </span>
  );
}
