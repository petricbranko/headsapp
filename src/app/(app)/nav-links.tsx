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
    <nav className="flex items-center gap-0.5 sm:gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-full px-2.5 py-1.5 text-[13px] sm:px-3 sm:text-[14px] transition-colors ${path.startsWith(l.href) ? "bg-bg-muted text-fg" : "text-fg-muted hover:text-fg"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
