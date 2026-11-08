// A hand-drawn aside pointing at the hero CTA: slanted serif italic (existing
// font) plus an inline SVG arrow. Decorative, so hidden from assistive tech.
export function HeroNote({ children }: { children: string }) {
  return (
    <p
      aria-hidden="true"
      className="flex items-start gap-2 text-iron sm:items-center"
    >
      <svg
        viewBox="0 0 56 44"
        width="56"
        height="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 sm:-rotate-45"
      >
        <path d="M46 40C40 30 30 24 18 24C13 24 9 22 7 17" />
        <path d="M5 8L7 17L16 14" />
      </svg>
      <span className="hand-note max-w-[16ch] text-lg leading-tight">{children}</span>
    </p>
  );
}
