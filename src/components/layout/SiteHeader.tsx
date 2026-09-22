import Link from "next/link";

const NAV_LINKS = [
  { href: "/write", label: "Write" },
  { href: "/technical", label: "Technical" },
  { href: "/explain-code", label: "Explain Code" },
  { href: "/interview", label: "Interview" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/exercises", label: "Exercises" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-dashed">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="text-sm font-medium tracking-normal uppercase">
          AI English Coach
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium tracking-normal text-muted-foreground uppercase">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
