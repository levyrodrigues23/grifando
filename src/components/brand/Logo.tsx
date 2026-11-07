// Proofreader's mark: an "i" whose tittle is a violet square, resting on a violet underline.
// Geometry is drawn as plain rects so it stays legible at 16px.
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect x="12" y="2" width="8" height="8" fill="#0007cb" />
      <rect x="12" y="12.5" width="8" height="12.5" fill="#111111" />
      <rect x="3" y="26.5" width="26" height="4" fill="#0007cb" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-[1.3em] w-[1.3em] shrink-0" />
      <span className="font-light tracking-[-0.03em]">Inglesando</span>
    </span>
  );
}
