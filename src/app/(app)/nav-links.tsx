"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stack", label: "Stack" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 sm:gap-3">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-1.5 py-1.5 text-[14px] transition-colors sm:px-2 ${path.startsWith(l.href) ? "text-fg" : "text-fg-subtle hover:text-fg"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
