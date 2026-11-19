import Link from "next/link";

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path d="M10 21.5V10.5M22 21.5V10.5M10 16h12" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-fg">
      <LogoMark />
      HeadsApp
    </Link>
  );
}
