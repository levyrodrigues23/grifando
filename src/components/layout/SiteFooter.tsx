import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "/write", label: "Write" },
  { href: "/exercises", label: "Exercises" },
  { href: "/privacy", label: "Privacy" },
  { href: "/settings", label: "Key settings" },
];

const linkClass = "text-muted-foreground transition-colors hover:text-foreground";

// Minimal: wordmark on the left, one wrapping row of quiet links on the right.
// No rule, just space above.
export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1200px] px-6 pt-28 pb-12 md:px-12 md:pt-36">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" aria-label="Grifando home" className="text-subheading">
          <Logo />
        </Link>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://github.com/levyrodrigues23/grifando"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                GitHub
              </a>
            </li>
            <li className="text-smoke">© 2026 Grifando</li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
