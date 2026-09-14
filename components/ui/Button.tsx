"use client";

import { useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, EASE, gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Command Console button - see design.md #7 (Component Composition Rules).
 *
 * Variant signature is fixed: `variant` picks the fill, `size` picks the
 * scale. Every button in the app should render through this component
 * rather than repeating the border/bg utility chain inline.
 *
 * `icon` takes an already-rendered element (`<PlayCircle className="h-4 w-4" />`),
 * not a component reference - a bare component reference can't cross a
 * Server -> Client Component boundary (app/page.tsx renders Button from a
 * Server Component), while a rendered element can.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-signal bg-signal text-obsidian hover:opacity-90 disabled:opacity-60",
  secondary: "border border-hairline text-slate-300 hover:border-signal hover:text-signal disabled:opacity-50",
  ghost: "border border-transparent text-slate-400 hover:text-signal disabled:opacity-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs gap-1.5",
  md: "min-h-11 px-4 py-2.5 text-sm gap-2",
  lg: "min-h-12 px-5 py-3 text-sm gap-2",
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined };

type ButtonAsLink = ButtonOwnProps &
  Omit<React.ComponentProps<typeof Link>, keyof ButtonOwnProps | "href"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(props: ButtonProps) {
  const pressRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const onPointerDown = () => {
    if (!pressRef.current || prefersReducedMotion()) return;
    gsap.to(pressRef.current, { scale: 0.97, duration: DURATION.fast, ease: EASE.tactile });
  };
  const onPointerUp = () => {
    if (!pressRef.current || prefersReducedMotion()) return;
    gsap.to(pressRef.current, { scale: 1, duration: DURATION.fast, ease: EASE.tactile });
  };

  const {
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "left",
    loading = false,
    fullWidth = false,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(
    "group inline-flex items-center justify-center font-semibold tracking-wide transition-colors",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className
  );

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
      {!loading && icon && iconPosition === "left" ? icon : null}
      {children}
      {!loading && icon && iconPosition === "right" ? icon : null}
    </>
  );

  if ("href" in props && props.href !== undefined) {
    const { href, ...linkRest } = rest as Omit<ButtonAsLink, keyof ButtonOwnProps>;
    return (
      <Link
        href={href}
        ref={pressRef as React.Ref<HTMLAnchorElement>}
        className={classes}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        {...linkRest}
      >
        {content}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonAsButton, keyof ButtonOwnProps>;
  return (
    <button
      type="button"
      ref={pressRef as React.Ref<HTMLButtonElement>}
      className={classes}
      disabled={loading || buttonRest.disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
