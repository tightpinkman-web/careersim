"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import Logo from "@/components/Logo";
import { isImmersiveRoute } from "@/lib/immersiveRoutes";

const CONTACT_EMAIL = "tightpinkman@gmail.com";

export default function Footer() {
  const pathname = usePathname();
  if (isImmersiveRoute(pathname)) return null;

  return (
    <footer className="shrink-0 border-t border-slate-800 bg-obsidian font-mono">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Logo size={24} inverted />
          <p className="text-slate-500">&copy; {new Date().getFullYear()} CAREERSIM. ALL RIGHTS RESERVED.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-400">
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 hover:text-signal">
            <Mail className="h-3.5 w-3.5" />
            {CONTACT_EMAIL}
          </a>
          <Link href="/privacy" className="hover:text-signal">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-signal">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
