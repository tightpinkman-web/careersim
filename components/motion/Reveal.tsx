"use client";

import { useRevealOnMount } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

/**
 * Thin client island wrapping `useRevealOnMount` so server-rendered pages
 * (landing, catalog shell) can opt a section into a GSAP entrance without
 * becoming client components themselves.
 */
export default function Reveal({
  y,
  duration,
  className,
  children,
}: {
  y?: number;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRevealOnMount<HTMLDivElement>({ y, duration });
  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
