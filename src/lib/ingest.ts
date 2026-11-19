import "server-only";
import { cols } from "./db";
import { fetchGhsa } from "./sources/ghsa";
import { fetchKev } from "./sources/kev";
import { fetchStatusPages } from "./sources/statuspage";
import { fetchNews } from "./sources/news";
import { npmPackagesForKeys } from "./sources/match";
import type { SourceResult, RawIncident } from "./sources/types";
import type { IncidentDoc } from "./types";
import { enrich, llmEnabled } from "./llm";
import { fanout, isFresh } from "./alerts";

export interface IngestSummary {
  startedAt: Date;
  durationMs: number;
  sources: { id: string; name: string; ok: boolean; count: number; error?: string }[];
  newIncidents: number;
  alertsSent: number;
  skipped?: "locked";
}

async function withLock<T>(id: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
  const { locks } = await cols();
  const now = new Date();
  try {
    await locks.deleteMany({ _id: id, expiresAt: { $lt: now } });
    await locks.insertOne({ _id: id, expiresAt: new Date(now.getTime() + ttlMs) });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return null;
    throw e;
  }
  try {
    return await fn();
  } finally {
    await locks.deleteOne({ _id: id });
  }
}

async function watchedPackages(extra: string[] = []): Promise<string[]> {
  const { users } = await cols();
  const keys = ((await users.distinct("stack.key")) as (string | null)[]).filter((k): k is string => typeof k === "string");
  return npmPackagesForKeys([...keys, ...extra]);
}

/** Store incidents; returns the ones that are new. Existing incidents pick up any new targets. */
async function store(raws: RawIncident[]): Promise<IncidentDoc[]> {
  const { incidents } = await cols();
  const fresh: IncidentDoc[] = [];
  // Merge duplicates inside one batch (e.g. same advisory from two GHSA queries).
  const merged = new Map<string, RawIncident>();
  for (const r of raws) {
    const prev = merged.get(r.sourceId);
    merged.set(r.sourceId, prev ? { ...prev, targets: [...new Set([...prev.targets, ...r.targets])] } : r);
  }
  for (let raw of merged.values()) {
    if (!raw.targets.length) continue;
    const exists = await incidents.findOne({ sourceId: raw.sourceId }, { projection: { _id: 1 } });
    if (exists) {
      await incidents.updateOne({ _id: exists._id }, { $addToSet: { targets: { $each: raw.targets } } });
      continue;
    }
    // Spend LLM calls only on things that could actually be pushed to someone.
    if (llmEnabled() && isFresh(raw)) {
      raw = await enrich(raw);
      if (!raw.targets.length) continue;
    }
    const doc: IncidentDoc = { ...raw, fetchedAt: new Date() };
    try {
      const r = await incidents.insertOne(doc);
      fresh.push({ ...doc, _id: r.insertedId });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  return fresh;
}

async function runSource(id: string, name: string, fn: () => Promise<SourceResult>) {
  const { sources } = await cols();
  const now = new Date();
  try {
    const r = await fn();
    await sources.updateOne({ _id: id }, { $set: { name, lastRunAt: now, lastOkAt: now, lastCount: r.incidents.length }, $unset: { lastError: "" } }, { upsert: true });
    return { id, name, ok: true, count: r.incidents.length, incidents: r.incidents };
  } catch (err) {
    const msg = (err as Error).message?.slice(0, 200) ?? String(err);
    console.warn(`[ingest] ${id} failed: ${msg}`);
    await sources.updateOne({ _id: id }, { $set: { name, lastRunAt: now, lastError: msg } }, { upsert: true });
    return { id, name, ok: false, count: 0, error: msg, incidents: [] as RawIncident[] };
  }
}

export async function runIngest(): Promise<IngestSummary> {
  const startedAt = new Date();
  const result = await withLock("ingest", 10 * 60 * 1000, async () => {
    const pkgs = await watchedPackages();
    const { users } = await cols();
    const customNames = ((await users.distinct("stack.key")) as (string | null)[])
      .filter((k): k is string => typeof k === "string" && k.startsWith("custom:"))
      .map((k) => k.slice(7));
    const results = await Promise.all([
      runSource("ghsa", "GitHub Security Advisories", () => fetchGhsa(pkgs)),
      runSource("kev", "CISA Known Exploited Vulnerabilities", fetchKev),
      runSource("status", "Vendor status pages", fetchStatusPages),
      runSource("news", "Security news", () => fetchNews(customNames)),
    ]);
    const fresh = await store(results.flatMap((r) => r.incidents));
    let alertsSent = 0;
    for (const inc of fresh.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())) {
      try {
        alertsSent += (await fanout(inc)).sent;
      } catch (e) {
        console.error(`[ingest] fanout failed for ${inc.sourceId}:`, (e as Error).message);
      }
    }
    return {
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      sources: results.map(({ incidents: _i, ...s }) => s),
      newIncidents: fresh.length,
      alertsSent,
    } satisfies IngestSummary;
  });
  if (result) console.log(`[ingest] done in ${result.durationMs}ms: ${result.newIncidents} new incidents, ${result.alertsSent} alerts`);
  return result ?? { startedAt, durationMs: 0, sources: [], newIncidents: 0, alertsSent: 0, skipped: "locked" };
}

/** When someone adds packages, pull their advisory history right away so the dashboard isn't empty. */
export async function backfillPackages(keys: string[]) {
  const pkgs = npmPackagesForKeys(keys);
  if (!pkgs.length) return;
  const r = await runSource("ghsa", "GitHub Security Advisories", () => fetchGhsa(pkgs));
  const fresh = await store(r.incidents);
  for (const inc of fresh) await fanout(inc);
}
