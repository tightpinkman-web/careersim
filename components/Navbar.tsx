"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn, LogOut, UserCircle, History, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo Sims" },
  { href: "/catalog", label: "Career Catalog" },
  { href: "/request", label: "Request a Sim" },
  { href: "/#contact", label: "Contact Us" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const isActive = (href: string) => {
    if (href === "/#contact") return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const loginHref = `/login?redirectTo=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-3 border-l border-slate-200/80 pl-3 text-xs text-slate-400">
            <Link href="/privacy" className="transition-colors hover:text-slate-600">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-slate-600">
              Terms
            </Link>
          </div>
          <div className="ml-1 flex items-center gap-1">
            {email === undefined ? null : email ? (
              <>
                <Link
                  href="/history"
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <History className="h-3.5 w-3.5" />
                  My History
                </Link>
                <span className="flex items-center gap-1 px-2 text-xs text-slate-500">
                  <UserCircle className="h-4 w-4" />
                  {email}
                </span>
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={loginHref}
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="group flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-slate-200/80 px-4 py-2 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(link.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-4 border-t border-slate-200/80 px-3 pt-2 text-xs text-slate-400">
            <Link href="/privacy" onClick={() => setOpen(false)} className="hover:text-slate-600">
              Privacy
            </Link>
            <Link href="/terms" onClick={() => setOpen(false)} className="hover:text-slate-600">
              Terms
            </Link>
          </div>
          <div className="mt-1 flex flex-col gap-1 pt-1">
            {email ? (
              <>
                <Link
                  href="/history"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <History className="h-4 w-4" />
                  My History
                </Link>
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out ({email})
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={loginHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
