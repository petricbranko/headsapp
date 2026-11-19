import "server-only";
import { fetchJson, pool } from "./http";
import { STATUS_SECURITY_RE } from "./match";
import type { RawIncident, SourceResult } from "./types";
import { CATALOG, vendorKey } from "../catalog";
import { truncate, stripHtml } from "../text";

interface SpIncident {
  id: string;
  name: string;
  impact: "none" | "minor" | "major" | "critical";
  shortlink?: string;
  created_at: string;
  incident_updates: { body: string; created_at: string }[];
}

/** Vendor status pages. Outages are ignored; only incidents that talk about security become alerts. */
export async function fetchStatusPages(): Promise<SourceResult> {
  const entries = CATALOG.filter((e) => e.statusPage);
  const incidents: RawIncident[] = [];
  const errors: string[] = [];
  const results = await pool(entries, 6, async (e) => {
    const data = await fetchJson<{ incidents: SpIncident[] }>(`${e.statusPage}/api/v2/incidents.json`, { timeoutMs: 10000 });
    return { e, data };
  });
  for (const r of results) {
    if (r.status === "rejected") {
      errors.push(String((r.reason as Error)?.message ?? r.reason));
      continue;
    }
    const { e, data } = r.value;
    for (const inc of data.incidents ?? []) {
      const updates = (inc.incident_updates ?? []).map((u) => stripHtml(u.body ?? ""));
      const text = `${inc.name} ${updates.join(" ")}`;
      if (!STATUS_SECURITY_RE.test(text)) continue;
      const first = updates[updates.length - 1] ?? inc.name;
      incidents.push({
        sourceId: `status:${e.slug}:${inc.id}`,
        source: "status",
        sourceName: `${e.name} status page`,
        title: `${e.name}: ${inc.name}`,
        whatHappened: truncate(first, 360),
        whatToDo: [`Read ${e.name}'s updates on the status page`, `Rotate ${e.name} API keys or tokens if they recommend it`, "Review recent account activity and audit logs"],
        url: inc.shortlink || `${e.statusPage}/incidents/${inc.id}`,
        severity: inc.impact === "critical" ? "critical" : "high",
        publishedAt: new Date(inc.created_at),
        cves: [],
        targets: [vendorKey(e.slug)],
      });
    }
  }
  if (errors.length === entries.length) throw new Error(`all status pages failed: ${errors[0]}`);
  return { id: "status", name: "Vendor status pages", incidents };
}
