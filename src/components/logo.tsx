import Link from "next/link";

/** Green tile with a "ping": a head and a notification dot. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <rect width="28" height="28" rx="8" fill="var(--accent)" />
      <circle cx="12" cy="15.5" r="5.5" fill="#fff" />
      <circle cx="20.5" cy="7.75" r="2.75" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = "/", size = 22 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-fg">
      <LogoMark size={size} />
      HeadsApp
    </Link>
  );
}
