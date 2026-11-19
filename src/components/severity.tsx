import type { Severity } from "@/lib/types";

const STYLES: Record<Severity, { dot: string; label: string }> = {
  critical: { dot: "bg-[#e5484d]", label: "Critical" },
  high: { dot: "bg-[#f76b15]", label: "High" },
  medium: { dot: "bg-[#ffc53d]", label: "Medium" },
  low: { dot: "bg-fg-subtle", label: "Low" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
