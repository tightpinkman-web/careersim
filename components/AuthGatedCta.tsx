"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthGatedCtaProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A homepage CTA that sends signed-in visitors straight to the feature and signed-out visitors
 * to /login?redirectTo=<href> instead. This is a UX nicety, not the real security boundary - the
 * proxy already redirects unauthenticated requests to these same routes server-side regardless
 * (see PROTECTED_PAGE_PREFIXES in proxy.ts), so a plain <a href> with JS disabled still ends up
 * in the right place, just via one extra round trip.
 */
export default function AuthGatedCta({ href, className, children }: AuthGatedCtaProps) {
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    router.push(user ? href : `/login?redirectTo=${encodeURIComponent(href)}`);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
