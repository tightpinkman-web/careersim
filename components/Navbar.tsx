"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, User, ChevronDown, History, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { internalEmailToUsername } from "@/lib/username";
import { DURATION, EASE, gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";

const NAV_LINKS = [
  { href: "/demo", label: "Demo Sims", title: "Instant access to 5 flagship scenarios — test drive right now." },
  {
    href: "/catalog",
    label: "Career Catalog",
    title: "Browse all 15+ career paths across tech, finance, law, and security.",
  },
  {
    href: "/request",
    label: "Request a Sim",
    title: "Need a specific industry? Suggest new simulation scenarios for our build pipeline.",
  },
  { href: "/history", label: "My History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname.startsWith(href);

  useEffect(() => {
    const supabase = createClient();

    const deriveUsername = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) return null;
      return (user.user_metadata?.username as string | undefined) || internalEmailToUsername(user.email ?? "");
    };

    supabase.auth.getUser().then(({ data }) => setUsername(deriveUsername(data.user)));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsername(deriveUsername(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  useGSAP(
    () => {
      if (!menuRef.current) return;
      if (prefersReducedMotion()) {
        gsap.set(menuRef.current, { height: open ? "auto" : 0, opacity: open ? 1 : 0 });
        return;
      }
      gsap.to(menuRef.current, {
        height: open ? "auto" : 0,
        opacity: open ? 1 : 0,
        duration: DURATION.base,
        ease: EASE.snap,
      });
    },
    { dependencies: [open] }
  );

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-hairline bg-obsidian font-display">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo inverted />
          </Link>
          <span className="hidden items-center gap-1.5 border border-hairline px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-signal sm:inline-flex">
            <span className="h-1.5 w-1.5 shrink-0 bg-signal" aria-hidden="true" />
            SYS_ONLINE
          </span>
        </div>

        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={link.title}
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

        <div className="hidden items-center gap-3 sm:flex">
          {username === undefined ? null : username ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-9 items-center gap-1.5 border border-hairline px-3 text-sm font-medium text-slate-300 hover:border-signal hover:text-signal"
                aria-expanded={menuOpen}
              >
                <User className="h-3.5 w-3.5" />
                @{username}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", menuOpen && "rotate-180")} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 border border-hairline bg-surface py-1 shadow-lg">
                  <Link
                    href="/history"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-obsidian hover:text-signal"
                  >
                    <History className="h-3.5 w-3.5" />
                    My History
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 hover:bg-obsidian hover:text-signal"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-ink">
                Sign In
              </Link>
              <Button href="/signup" size="sm">
                Sign Up
              </Button>
            </>
          )}
        </div>

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

      <div ref={menuRef} className="overflow-hidden opacity-0 sm:hidden" style={{ height: 0 }}>
        <nav className="flex flex-col gap-1 border-t border-hairline px-6 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-hidden={!open}
              tabIndex={open ? undefined : -1}
              className={cn(
                "flex min-h-11 items-center px-3 text-sm font-medium tracking-wide transition-colors",
                isActive(link.href) ? "border-l-2 border-signal text-signal" : "text-slate-400 hover:text-ink"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-hairline pt-3">
            {username ? (
              <>
                <span className="px-3 text-xs font-medium text-slate-500">Signed in as @{username}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleSignOut();
                  }}
                  className="flex min-h-11 items-center gap-2 px-3 text-left text-sm font-medium text-slate-400 hover:text-ink"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center px-3 text-sm font-medium text-slate-400 hover:text-ink"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center px-3 text-sm font-medium text-signal"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
