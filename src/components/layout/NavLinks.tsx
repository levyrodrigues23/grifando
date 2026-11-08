"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

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
  { href: "/settings", label: "Key" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// Desktop: a row of pills where the linen pill marks the active route.
// Mobile: ten tabs don't fit, so the row collapses into a disclosure that names
// the current page and opens the full list.
export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const current = NAV_LINKS.find((link) => isActive(pathname, link.href));

  return (
    <nav aria-label="Main">
      <ul className="hidden flex-wrap gap-1 pt-5 pb-1 md:flex">
        {NAV_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-pill px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-linen text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:bg-linen/70 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="pt-4 md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-full items-center justify-between rounded-pill bg-card px-5 text-sm ring-1 ring-border"
        >
          <span>
            <span className="label-mono mr-3 text-muted-foreground">Menu</span>
            {current?.label ?? "Pages"}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
        <ul
          id={listId}
          hidden={!open}
          className="mt-2 overflow-hidden rounded-card bg-card ring-1 ring-border"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href} className="border-b border-border last:border-0">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-12 items-center px-4 text-base",
                    active ? "bg-linen text-foreground" : "text-iron hover:bg-linen",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
