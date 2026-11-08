import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { FocusMusic } from "@/components/layout/FocusMusic";
import { NavLinks } from "@/components/layout/NavLinks";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-6 pt-5 md:px-12">
        <Link href="/" aria-label="Grifando home" className="text-subheading">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <FocusMusic />
          <Button size="sm" className="hidden sm:inline-flex" render={<Link href="/today">Start today</Link>} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-12">
        <NavLinks />
      </div>
    </header>
  );
}
