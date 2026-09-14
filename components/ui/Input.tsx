"use client";

import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { DURATION, EASE, gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Command Console form field - see design.md #7 (Component Composition Rules).
 * Shared focus micro-interaction (a brief amber ring pulse via GSAP) backs
 * every text input/textarea in the app instead of a bare CSS `focus:` swap.
 */
function useFocusPulse<T extends HTMLElement>() {
  const localRef = useRef<T | null>(null);

  const onFocus = () => {
    if (!localRef.current || prefersReducedMotion()) return;
    gsap.fromTo(
      localRef.current,
      { boxShadow: "0 0 0 0 rgba(255,184,0,0.35)" },
      { boxShadow: "0 0 0 3px rgba(255,184,0,0.18)", duration: DURATION.fast, ease: EASE.tactile }
    );
  };
  const onBlur = () => {
    if (!localRef.current || prefersReducedMotion()) return;
    gsap.to(localRef.current, { boxShadow: "0 0 0 0 rgba(255,184,0,0)", duration: DURATION.fast, ease: EASE.tactile });
  };

  return { localRef, onFocus, onBlur };
}

const fieldClasses = (error: boolean | undefined, className: string | undefined) =>
  cn(
    "w-full border bg-obsidian px-3 py-2.5 text-base text-ink outline-none placeholder:text-slate-500",
    "focus:border-signal",
    error ? "border-rose-800" : "border-hairline",
    className
  );

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, onFocus, onBlur, ...rest },
  forwardedRef
) {
  const { localRef, onFocus: pulseFocus, onBlur: pulseBlur } = useFocusPulse<HTMLInputElement>();

  return (
    <input
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className={fieldClasses(error, className)}
      onFocus={(e) => {
        pulseFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        pulseBlur();
        onBlur?.(e);
      }}
      {...rest}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, onFocus, onBlur, ...rest },
  forwardedRef
) {
  const { localRef, onFocus: pulseFocus, onBlur: pulseBlur } = useFocusPulse<HTMLTextAreaElement>();

  return (
    <textarea
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className={cn(fieldClasses(error, className), "resize-none")}
      onFocus={(e) => {
        pulseFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        pulseBlur();
        onBlur?.(e);
      }}
      {...rest}
    />
  );
});
