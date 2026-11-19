import type { Severity } from "@/lib/types";

const STYLES: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: "var(--sev-critical)", bg: "#fdecec", label: "Critical" },
  high: { color: "var(--sev-high)", bg: "#fef0e6", label: "High" },
  medium: { color: "#b98a00", bg: "#fdf6dc", label: "Medium" },
  low: { color: "var(--sev-low)", bg: "#f3f3f5", label: "Low" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium" style={{ color: s.color, background: s.bg }}>
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
