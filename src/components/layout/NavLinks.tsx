"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/today", label: "Today" },
  { href: "/write", label: "Write" },
  { href: "/technical", label: "Technical" },
  { href: "/explain-code", label: "Explain code" },
  { href: "/interview", label: "Interview" },
  { href: "/exercises", label: "Exercises" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/vocabulary", label: "Vocabulary" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// Tab-style navigation: the 2px ink underline is the only active-state signal.
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-7 pt-6">
        {NAV_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block border-b-2 pb-3 text-sm transition-colors",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
