import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Pixel size of the icon mark. Wordmark text scales proportionally. */
  size?: number;
  /** Render the "CareerSim" wordmark next to the mark. Set false for icon-only contexts. */
  showText?: boolean;
}

/**
 * Solid slate mark (an upward line with a squared arrowhead, no gradient or color accent) plus a
 * plain two-weight wordmark. Kept as one flat shape so it stays legible down to favicon size.
 */
export default function Logo({ className, size = 32, showText = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1" y="1" width="30" height="30" rx="7" fill="#0f172a" />
        <path
          d="M9 23L21 11M21 17L21 11L15 11"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      {showText && (
        <span
          className="flex items-baseline font-bold leading-none tracking-tight"
          style={{ fontSize: size * 0.5 }}
        >
          <span className="text-slate-900">Career</span>
          <span className="text-slate-500">Sim</span>
        </span>
      )}
    </span>
  );
}
