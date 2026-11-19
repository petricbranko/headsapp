import type { Severity } from "@/lib/types";

const STYLES: Record<Severity, { dot: string; label: string }> = {
  critical: { dot: "bg-[var(--sev-critical)]", label: "Critical" },
  high: { dot: "bg-[var(--sev-high)]", label: "High" },
  medium: { dot: "bg-[var(--sev-medium)]", label: "Medium" },
  low: { dot: "bg-fg-subtle", label: "Low" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-muted">
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
