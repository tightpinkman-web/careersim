"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

const NAV_LINKS = [
  { href: "/demo", label: "Demo Sims" },
  { href: "/catalog", label: "Career Catalog" },
  { href: "/request", label: "Request a Sim" },
  { href: "/history", label: "My History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-hairline bg-obsidian font-display">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo inverted />
          </Link>
          <span className="hidden items-center gap-1.5 border border-hairline px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-signal sm:inline-flex">
            <span className="h-1.5 w-1.5 shrink-0 bg-signal" aria-hidden="true" />
            [SYS_ONLINE]
          </span>
        </div>

        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative py-1 text-sm font-medium tracking-wide transition-colors",
                isActive(link.href) ? "text-signal" : "text-slate-400 hover:text-ink"
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-signal" aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center border border-hairline text-slate-300 hover:border-signal hover:text-signal sm:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-hairline px-6 py-3 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center px-3 text-sm font-medium tracking-wide transition-colors",
                isActive(link.href) ? "border-l-2 border-signal text-signal" : "text-slate-400 hover:text-ink"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
