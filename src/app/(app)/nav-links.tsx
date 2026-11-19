"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

export const NAV = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/incidents", label: "Incidents", icon: "incidents" },
  { href: "/stack", label: "Stack", icon: "stack" },
  { href: "/alerts", label: "Alerts", icon: "alerts" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function NavLinks({ variant = "sidebar" }: { variant?: "sidebar" | "top" }) {
  const path = usePathname();
  if (variant === "top")
    return (
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {NAV.map((l) => (
          <Link key={l.href} href={l.href} className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium ${path.startsWith(l.href) ? "bg-bg-muted text-fg" : "text-fg-muted"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    );
  return (
    <nav className="space-y-0.5">
      {NAV.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[14px] transition-colors ${active ? "bg-bg-muted font-medium text-fg" : "text-fg-muted hover:bg-bg-hover hover:text-fg"}`}
          >
            <span className={active ? "text-fg" : "text-fg-subtle"}>
              <Icon name={l.icon} />
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
