import { LOGOS } from "@/lib/logos.generated";

/* Brands without a public logo get a clean letter tile in a stable, muted colour. */
const TILE = [
  ["#eef0ff", "#4b4fc4"], ["#e8f5ee", "#1f7a4d"], ["#fdf0e6", "#b05a17"], ["#f1ecfb", "#6b45b5"],
  ["#e7f3f8", "#1f6f8b"], ["#fbeaf0", "#a83a64"], ["#f2f2f4", "#4b4b57"],
];
function tile(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILE[h % TILE.length];
}

/** Brand logo tile for a stack key ("vendor:vercel", "npm:axios", "custom:Acme"). */
export function ToolLogo({ stackKey, name, size = 32 }: { stackKey: string; name: string; size?: number }) {
  const [kind, slug] = [stackKey.split(":")[0], stackKey.slice(stackKey.indexOf(":") + 1)];
  const logo = kind === "vendor" ? LOGOS[slug] : undefined;
  const inner = Math.round(size * 0.56);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-[9px] bg-bg-muted"
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
        <span className="grid h-full w-full place-items-center font-semibold" style={{ background: tile(name)[0], color: tile(name)[1], fontSize: Math.max(10, size * 0.42), borderRadius: "inherit" }}>
          {name.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
