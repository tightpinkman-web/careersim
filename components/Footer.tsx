"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const FOOTER_LINKS = [
  { href: "/catalog", label: "Career Catalog" },
  { href: "/demo", label: "Demo Sims" },
  { href: "/request", label: "Request a Sim" },
  { href: "/#contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// The live simulation experience (/demo, /simulations/*) is a full-viewport, app-like shell -
// a footer underneath it would just eat into the vertical space that layout depends on. Every
// other route is a normal marketing/content page and gets the standard site footer.
const FOOTER_HIDDEN_PREFIXES = ["/demo", "/simulations"];

export default function Footer() {
  const pathname = usePathname();
  if (FOOTER_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="shrink-0 border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="max-w-xs">
          <Logo size={28} />
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Live, AI-driven career simulations that let students test-drive a career before
            choosing a major.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium text-slate-600 transition-colors hover:text-indigo-600">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-200/80">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-3 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} CareerSim. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-slate-600">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
