import type { Severity } from "@/lib/types";

const LABEL: Record<Severity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
/* Colour is reserved for what needs action: only critical/high get a dot. */
const DOT: Partial<Record<Severity, string>> = { critical: "bg-[#e5484d]", high: "bg-[#f76b15]" };

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
      {DOT[severity] && <span className={`size-1.5 rounded-full ${DOT[severity]}`} />}
      {LABEL[severity]}
    </span>
  );
}
