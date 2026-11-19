import Link from "next/link";
import type { Filter } from "mongodb";
import { requireUser } from "@/lib/auth";
import { cols } from "@/lib/db";
import { labelForKey, escapeRegexForSearch } from "@/lib/catalog";
import { SeverityBadge } from "@/components/severity";
import { ToolLogo } from "@/components/tool-logo";
import { PageHeader } from "@/components/page-header";
import type { IncidentDoc, Severity } from "@/lib/types";

export const metadata = { title: "Incidents" };

const SEVS: Severity[] = ["critical", "high", "medium", "low"];
const PAGE = 50;

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export default async function Incidents({ searchParams }: { searchParams: Promise<{ q?: string; sev?: string; tool?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const keys = user.stack.map((s) => s.key);
  const tool = sp.tool && keys.includes(sp.tool) ? sp.tool : undefined;
  const sev = SEVS.includes(sp.sev as Severity) ? (sp.sev as Severity) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));

  const { incidents, alerts } = await cols();
  const filter: Filter<IncidentDoc> = { targets: tool ? tool : { $in: keys } };
  if (sev) filter.severity = sev;
  if (q) filter.title = { $regex: escapeRegexForSearch(q), $options: "i" };
  const [rows, total] = keys.length
    ? await Promise.all([incidents.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).toArray(), incidents.countDocuments(filter)])
    : [[], 0];
  const alerted = new Set(
    (await alerts.find({ userId: user._id, kind: "incident", incidentId: { $in: rows.map((r) => r._id!) }, status: { $in: ["sent", "logged"] } }, { projection: { incidentId: 1 } }).toArray()).map((a) => a.incidentId!.toString()),
  );
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q: q || undefined, sev, tool, ...p };
    Object.entries(merged).forEach(([k, v]) => v && u.set(k, v));
    const s = u.toString();
    return s ? `/incidents?${s}` : "/incidents";
  };

  return (
    <div>
      <PageHeader title="Incidents" description="Every incident that touched a tool in your stack." />

      <form className="mb-5 flex flex-col gap-2.5 sm:flex-row" action="/incidents">
        <input name="q" defaultValue={q} className="input sm:max-w-[320px]" placeholder="Search incidents" />
        <select name="tool" defaultValue={tool ?? ""} className="input sm:w-[200px]">
          <option value="">All tools</option>
          {user.stack.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="sev" defaultValue={sev ?? ""} className="input sm:w-[170px]">
          <option value="">Any severity</option>
          {SEVS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button className="btn-secondary h-10">Filter</button>
        {(q || sev || tool) && (
          <Link href="/incidents" className="btn-ghost h-10">
            Clear
          </Link>
        )}
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-bg-subtle text-[12px] font-medium text-fg-muted">
            <tr>
              <th className="w-[110px] px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Incident</th>
              <th className="hidden w-[220px] px-5 py-2.5 font-medium md:table-cell">Affects</th>
              <th className="w-[120px] px-5 py-2.5 font-medium">Severity</th>
              <th className="hidden w-[110px] px-5 py-2.5 font-medium lg:table-cell">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((inc) => {
              const mine = inc.targets.filter((t) => keys.includes(t));
              return (
                <tr key={inc._id!.toString()} className="group transition-colors hover:bg-bg-subtle">
                  <td className="whitespace-nowrap px-5 py-3.5 align-top tabular-nums text-fg-muted">{fmt(inc.publishedAt)}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/incidents/${inc._id}`} className="font-medium text-fg hover:text-accent-text">
                      {inc.title}
                    </Link>
                  </td>
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <span className="flex items-center gap-2">
                      <ToolLogo stackKey={mine[0]} name={labelForKey(mine[0])} size={22} />
                      <span className="truncate text-fg-muted">{mine.map(labelForKey).join(", ")}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td className="hidden px-5 py-3.5 text-[13px] lg:table-cell">{alerted.has(inc._id!.toString()) ? <span className="text-accent-text">Sent</span> : <span className="text-fg-subtle">—</span>}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-[14px] text-fg-muted">
                  {q || sev || tool ? "No incidents match these filters." : "No incidents yet. That's a good thing."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-fg-muted">
          <span>
            {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-secondary btn-sm">Previous</Link>}
            {page * PAGE < total && <Link href={qs({ page: String(page + 1) })} className="btn-secondary btn-sm">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
