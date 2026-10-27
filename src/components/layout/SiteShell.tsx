import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SiteFooter } from "@/components/layout/SiteFooter";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-paper focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:font-medium focus:text-navy focus:outline-none"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="content">{children}</main>
      <SiteFooter />
    </>
  );
}
