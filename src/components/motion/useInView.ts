"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// True once the element has scrolled into view; the observer then disconnects,
// so it fires once. Without IntersectionObserver it never reports in view (callers render final state).
export function useInView<T extends Element>(
  options?: IntersectionObserverInit,
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const threshold = options?.threshold;
  const rootMargin = options?.rootMargin;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: threshold ?? 0,
        rootMargin: rootMargin ?? "0px 0px -10% 0px",
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}
