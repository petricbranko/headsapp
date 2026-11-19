import "server-only";
import { fetchJson } from "./http";
import { keysForNpmPackage } from "./match";
import type { RawIncident, SourceResult } from "./types";
import type { Severity } from "../types";
import { lede } from "../text";
import { env } from "../env";

interface Advisory {
  ghsa_id: string;
  cve_id: string | null;
  html_url: string;
  summary: string;
  description: string | null;
  type: "reviewed" | "malware" | "unreviewed";
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  published_at: string;
  withdrawn_at: string | null;
  vulnerabilities: { package: { ecosystem: string; name: string } | null; vulnerable_version_range: string | null; first_patched_version: string | null }[] | null;
}

const API = "https://api.github.com/advisories";

function headers(): Record<string, string> {
  const h: Record<string, string> = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
  if (env.githubToken) h.authorization = `Bearer ${env.githubToken}`;
  return h;
}

function normalize(a: Advisory, onlyPackages?: Set<string>): RawIncident | null {
  if (a.withdrawn_at) return null;
  const vulns = (a.vulnerabilities ?? []).filter((v) => v.package?.ecosystem === "npm" && v.package.name);
  const pkgs = [...new Set(vulns.map((v) => v.package!.name))];
  const relevant = onlyPackages ? pkgs.filter((p) => onlyPackages.has(p)) : pkgs;
  if (!relevant.length) return null;

  const malware = a.type === "malware";
  const severity: Severity = malware ? "critical" : a.severity === "unknown" ? "medium" : a.severity;
  const whatToDo: string[] = [];
  if (malware) {
    for (const p of relevant.slice(0, 2)) whatToDo.push(`Remove ${p} from package.json and your lockfile, then reinstall`);
    whatToDo.push("Treat machines and CI runners that installed it as compromised: rotate tokens and secrets");
  } else {
    for (const v of vulns.filter((v) => relevant.includes(v.package!.name)).slice(0, 2)) {
      const name = v.package!.name;
      if (v.first_patched_version) whatToDo.push(`Upgrade ${name} to ${v.first_patched_version} or later (affected: ${v.vulnerable_version_range ?? "see advisory"})`);
      else whatToDo.push(`No fix for ${name} yet (affected: ${v.vulnerable_version_range ?? "see advisory"}). Apply the advisory's workaround`);
    }
  }
  whatToDo.push(`Check if you use it: npm ls ${relevant[0]}`);

  const what = a.description ? lede(a.description, 320) : a.summary;
  return {
    sourceId: `ghsa:${a.ghsa_id}`,
    source: "ghsa",
    sourceName: malware ? "GitHub malware advisory" : "GitHub Security Advisory",
    title: malware ? `Malicious package: ${relevant.join(", ")}` : a.summary,
    whatHappened: malware ? `${relevant.join(", ")} was published to npm with malicious code. ${what}`.slice(0, 400) : what,
    whatToDo: [...new Set(whatToDo)].slice(0, 3),
    url: a.html_url,
    severity,
    publishedAt: new Date(a.published_at),
    cves: a.cve_id ? [a.cve_id] : [],
    targets: [...new Set(relevant.flatMap(keysForNpmPackage))],
  };
}

/**
 * Two kinds of queries:
 *  1. The latest npm advisories (reviewed + malware), to catch anything new quickly.
 *  2. Targeted lookups for the packages users actually watch (`affects=`), so the
 *     dashboard shows real history for each stack item.
 * Results are filtered to watched packages; nothing else is stored.
 */
export async function fetchGhsa(watched: string[]): Promise<SourceResult> {
  const set = new Set(watched);
  const incidents: RawIncident[] = [];
  if (!set.size) return { id: "ghsa", name: "GitHub Security Advisories", incidents };

  const urls = [`${API}?ecosystem=npm&per_page=100&sort=published&direction=desc`, `${API}?ecosystem=npm&type=malware&per_page=100&sort=published&direction=desc`];
  const list = [...set];
  for (let i = 0; i < list.length; i += 15) {
    urls.push(`${API}?ecosystem=npm&per_page=50&sort=published&direction=desc&affects=${encodeURIComponent(list.slice(i, i + 15).join(","))}`);
  }
  // Without a token GitHub allows 60 req/h; keep each run small.
  const capped = urls.slice(0, env.githubToken ? 40 : 8);
  for (const url of capped) {
    const data = await fetchJson<Advisory[]>(url, { headers: headers() });
    for (const a of data) {
      const n = normalize(a, set);
      if (n) incidents.push(n);
    }
  }
  return { id: "ghsa", name: "GitHub Security Advisories", incidents };
}
