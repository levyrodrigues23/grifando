import type { ReactNode } from "react";

import { cn } from "cn";

// The editorial "spread" opening every page: a whisper-weight headline on the
// left, a narrow serif standfirst (and optional actions) in a column beside it.
export function PageHeader({
  title,
  description,
  actions,
  size = "display",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: "display" | "display-lg";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid gap-x-16 gap-y-6 pt-12 pb-12 md:pt-20 md:pb-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end",
        className,
      )}
    >
      <h1 className={cn("rise-in", size === "display-lg" ? "text-display-lg" : "text-display")}>
        {title}
      </h1>
      {description || actions ? (
        <div className="rise-in space-y-6 lg:pb-1" style={{ animationDelay: "80ms" }}>
          {description ? (
            <div className="prose-serif text-lg text-iron">{description}</div>
          ) : null}
          {actions ? (
            <div className="rise-in flex flex-wrap gap-2" style={{ animationDelay: "160ms" }}>
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

// The page container: the reference's 1200px column with generous gutters.
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-[1200px] px-6 md:px-12", className)}>{children}</main>
  );
}

// A section separated by surface tone and space, never by a divider line.
export function Section({
  children,
  tone = "canvas",
  className,
}: {
  children: ReactNode;
  tone?: "canvas" | "linen";
  className?: string;
}) {
  return (
    <section
      className={cn(
        tone === "linen" ? "rounded-card bg-linen px-6 py-10 md:px-10 md:py-12" : "py-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

// Section heading: Inter 300 at 32px. No eyebrow/kicker above it.
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
      <h2 className="text-heading">{children}</h2>
      {aside}
    </div>
  );
}
