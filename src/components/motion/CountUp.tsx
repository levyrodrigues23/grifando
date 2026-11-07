"use client";

import { useEffect, useState } from "react";

import { useInView } from "./useInView";

const DURATION_MS = 400;

// Renders the final value on the server and for reduced motion; on first view it
// counts up from 0 once. Hydration keeps the final value, so no-JS is correct.
export function CountUp({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {shown}
      {suffix}
    </span>
  );
}
