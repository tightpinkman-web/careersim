"use client";

import { useStaggerReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

/**
 * Thin client island wrapping `useStaggerReveal` - staggers the entrance of
 * every `selector` match inside it. Pairs with `<Card data-reveal-item>` in
 * a `<BentoGrid>`.
 */
export default function RevealGrid({
  selector = "[data-reveal-item]",
  className,
  children,
}: {
  selector?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useStaggerReveal<HTMLDivElement>(selector);
  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
