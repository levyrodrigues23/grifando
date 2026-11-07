"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "cn";

import { useInView } from "./useInView";

// Content is rendered visible on the server. Only after hydration does it get
// the hidden "pending" class, then the "in" class when scrolled into view, so
// nothing is ever hidden for a visitor without JavaScript.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    // Arm only if the element is not already on screen at hydration time.
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (
      typeof IntersectionObserver !== "undefined" &&
      rect.top > window.innerHeight
    ) {
      setArmed(true);
    }
  }, [ref]);

  return (
    <div
      ref={ref}
      className={cn(
        armed && (inView ? "reveal reveal-in" : "reveal"),
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
