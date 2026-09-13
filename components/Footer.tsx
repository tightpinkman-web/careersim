"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import Logo from "@/components/Logo";

const CONTACT_EMAIL = "tightpinkman@gmail.com";
const CONTACT_PHONE = "9739409451";
const CONTACT_PHONE_DISPLAY = "(973) 940-9451";

// The live simulation experience (/demo, /simulations/*) is a full-viewport, app-like shell -
// a footer underneath it would just eat into the vertical space that layout depends on. Every
// other route is a normal marketing/content page and gets the standard site footer.
const FOOTER_HIDDEN_PREFIXES = ["/demo", "/simulations"];

export default function Footer() {
  const pathname = usePathname();
  if (FOOTER_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Logo size={24} />
          <p className="text-slate-400">&copy; {new Date().getFullYear()} CareerSim. All rights reserved.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-500">
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 hover:text-slate-700">
            <Mail className="h-3.5 w-3.5" />
            {CONTACT_EMAIL}
          </a>
          <a href={`tel:${CONTACT_PHONE}`} className="flex items-center gap-1.5 hover:text-slate-700">
            <Phone className="h-3.5 w-3.5" />
            {CONTACT_PHONE_DISPLAY}
          </a>
          <Link href="/privacy" className="hover:text-slate-700">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-700">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
