import { LOGOS } from "@/lib/logos.generated";

function monogram(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Brand logo tile for a stack key ("vendor:vercel", "npm:axios", "custom:Acme"). */
export function ToolLogo({ stackKey, name, size = 32 }: { stackKey: string; name: string; size?: number }) {
  const [kind, slug] = [stackKey.split(":")[0], stackKey.slice(stackKey.indexOf(":") + 1)];
  const logo = kind === "vendor" ? LOGOS[slug] : undefined;
  const inner = Math.round(size * 0.55);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[9px] border border-border bg-bg shadow-[var(--shadow-xs)]"
      style={{ width: size, height: size, borderRadius: Math.max(6, size * 0.28) }}
      aria-hidden="true"
    >
      {logo ? (
        <svg width={inner} height={inner} viewBox="0 0 24 24">
          <path d={logo.path} fill={`#${logo.hex}`} />
        </svg>
      ) : kind === "npm" ? (
        <svg width={inner} height={inner} viewBox="0 0 24 24">
          <path fill="#CB3837" d={LOGOS["npm-registry"]?.path ?? ""} />
        </svg>
      ) : (
        <span className="text-[11px] font-semibold tracking-tight text-fg-muted" style={{ fontSize: Math.max(9, size * 0.32) }}>
          {monogram(name)}
        </span>
      )}
    </span>
  );
}
