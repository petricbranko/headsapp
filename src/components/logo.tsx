import Link from "next/link";

/** Mark: a solid disc with a small notification dot. Reads as "heads up" without any security cliché. */
export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <circle cx="9" cy="11" r="8" className="fill-fg" />
      <circle cx="16" cy="4" r="3.25" className="fill-accent stroke-bg" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-fg">
      <LogoMark />
      HeadsApp
    </Link>
  );
}
