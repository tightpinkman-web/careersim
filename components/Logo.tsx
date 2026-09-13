"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Pixel size of the icon mark. Wordmark text scales proportionally. */
  size?: number;
  /** Render the "CareerSim" wordmark next to the mark. Set false for icon-only contexts. */
  showText?: boolean;
}

/**
 * The mark is a rising three-node path with an arrowhead - career progression as a simple line
 * graph - inside a rounded indigo-to-teal badge. Kept legible down to favicon-ish sizes.
 */
export default function Logo({ className, size = 32, showText = true }: LogoProps) {
  // Unique per instance so multiple <Logo /> renders on one page (navbar + footer) don't collide
  // on the gradient's id.
  const gradientId = useId();

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="2" y1="38" x2="38" y2="2" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${gradientId})`} />
        <path
          d="M11 27L19.5 18.5L27 12"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <path
          d="M21 12H27V18"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="27" r="2.25" fill="white" />
        <circle cx="19.5" cy="18.5" r="2.25" fill="white" />
      </svg>
      {showText && (
        <span
          className="flex items-baseline font-bold leading-none tracking-tight"
          style={{ fontSize: size * 0.5 }}
        >
          <span className="text-slate-900">Career</span>
          <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">Sim</span>
        </span>
      )}
    </span>
  );
}
