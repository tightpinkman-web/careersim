"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isImmersiveRoute } from "@/lib/immersiveRoutes";
import Footer from "@/components/Footer";

export default function PageMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);

  return (
    <main
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto",
        !immersive && "mx-auto w-full max-w-7xl px-4 py-8"
      )}
    >
      {children}
      <Footer />
    </main>
  );
}
