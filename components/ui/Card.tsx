import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Hairline bento primitives - see design.md #7 (Component Composition Rules).
 * Depth comes from the obsidian/surface contrast, never box-shadow
 * (design.md #4 negative constraints).
 *
 * Two shapes:
 *  - `<Card>` alone: a bordered standalone panel (forms, modals).
 *  - `<BentoGrid><Card bordered={false} /></BentoGrid>`: grid cells share a
 *    single 1px hairline via the grid's `gap-px` + `bg-hairline` trick, so
 *    the cells themselves render border-free.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the hover-darken affordance used for clickable/voteable cards. */
  interactive?: boolean;
  /** Tighter padding for dense grid cells; "md" is the default panel padding. */
  padding?: "sm" | "md";
  /** False inside a `BentoGrid`, whose own hairline gap supplies the border. */
  bordered?: boolean;
}

export default function Card({
  interactive = false,
  padding = "md",
  bordered = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-surface",
        bordered && "border border-hairline",
        padding === "sm" ? "gap-3 p-5" : "gap-3 p-6 sm:p-8",
        interactive && "transition-colors hover:bg-surface/60",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export const BentoGrid = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function BentoGrid(
  { className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cn("grid grid-cols-1 gap-px border border-hairline bg-hairline", className)} {...rest}>
      {children}
    </div>
  );
});
