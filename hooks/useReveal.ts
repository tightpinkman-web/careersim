"use client";

import { useRef } from "react";
import { DURATION, EASE, gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";

interface RevealOptions {
  y?: number;
  /** Set for modal panels (design.md modal entrance uses a slight scale-in). */
  scale?: number;
  duration?: number;
  deps?: unknown[];
}

/**
 * Fades + rises a single element in on mount. Use for modal panels and
 * standalone page-entrance blocks (hero, section headers).
 */
export function useRevealOnMount<T extends HTMLElement>(options: RevealOptions = {}) {
  const { y = 14, scale, duration = DURATION.slow, deps = [] } = options;
  const ref = useRef<T | null>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y, ...(scale !== undefined ? { scale } : {}) },
        { opacity: 1, y: 0, ...(scale !== undefined ? { scale: 1 } : {}), duration, ease: EASE.entrance }
      );
    },
    { scope: ref, dependencies: deps }
  );

  return ref;
}

/**
 * Fades + rises the direct children matching `selector` in a staggered
 * sequence. Use for bento grids / card lists whose contents can change
 * (filters, search) - re-runs whenever `deps` changes.
 */
export function useStaggerReveal<T extends HTMLElement>(selector: string, deps: unknown[] = []) {
  const ref = useRef<T | null>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const items = ref.current.querySelectorAll(selector);
      if (!items.length) return;
      gsap.fromTo(
        items,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: DURATION.base, ease: EASE.entrance, stagger: 0.035 }
      );
    },
    { scope: ref, dependencies: deps }
  );

  return ref;
}
