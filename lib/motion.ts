"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

/**
 * Command Console GSAP tokens - see design.md #6 (Animation Guidelines).
 * Every timeline in the app should pull from here rather than hand-rolling
 * eases/durations, so motion stays consistent across surfaces.
 */
export const EASE = {
  /** Entrances: cards, modals, page sections settling into place. */
  entrance: "power2.out",
  /** Tactile press/release feedback on buttons and inputs. */
  tactile: "power3.out",
  /** Toggles that open/close (nav menu, accordions). */
  snap: "power2.inOut",
} as const;

export const DURATION = {
  /** Press/focus micro-interactions. */
  fast: 0.15,
  /** Card/section entrances, menu open/close. */
  base: 0.32,
  /** Modal entrances. */
  slow: 0.45,
} as const;

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, useGSAP };
