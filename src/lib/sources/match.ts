import { CATALOG, vendorKey, npmKey, type CatalogEntry } from "../catalog";
import { escapeRe } from "../text";

/** Headline words that signal a vendor itself was hit (used for `strict` vendors). */
export const BREACH_RE = /\b(breach(ed|es)?|hacked|compromis(e|ed|es)|leak(ed|s)?|exposed|stolen|unauthori[sz]ed|vulnerabilit(y|ies)|flaw|zero-day|0-day|CVE-\d{4}-\d+|exploit(ed|s)?|backdoor(ed)?|supply[- ]chain|hijack(ed)?|ransomware|data theft)\b/i;

/** Any security signal at all (news sources are security-focused, so this is a sanity check). */
export const SECURITY_RE = /\b(security|breach|hack|compromis|leak|exposed|stolen|unauthori[sz]ed|vulnerab|flaw|zero-day|CVE-|exploit|malware|malicious|backdoor|phish|ransomware|attack|credential|patch|supply[- ]chain|hijack)/i;

/**
 * Statuspage incidents: outages are ignored. Only explicit security language counts
 * (words like "exposed" or "leak" alone are too common in outage post-mortems).
 */
export const STATUS_SECURITY_RE = /\b(security (incident|issue|event|breach|vulnerability|notice|advisory|update)|data breach|breach of|unauthori[sz]ed (access|activity|actor|party|parties|third part(y|ies))|(account|accounts|systems?|credentials?|tokens?|keys?) (were|was|have been|has been|may have been) (compromised|exposed|accessed)|compromised (account|credentials|tokens?|keys?|systems?)|threat actor|malicious (actor|activity|package|code)|phishing campaign|rotate (your|all)? ?(api )?(keys|tokens|credentials|secrets)|(credentials?|tokens?|secrets?|api keys?) (rotation|reset|revoked|rotated|exposure))\b/i;

interface Compiled {
  entry: CatalogEntry;
  res: RegExp[];
}

const compiled: Compiled[] = CATALOG.filter((e) => e.news?.length).map((entry) => ({
  entry,
  res: entry.news!.map((n) =>
    typeof n === "string"
      ? new RegExp(`(?<![\\w.-])${escapeRe(n)}(?![\\w-]|\\.[a-z])`, "i")
      : new RegExp(`(?<![\\w.-])${escapeRe(n.exact)}(?![\\w-])`),
  ),
}));

/** Vendors a security-news headline is about. */
export function matchHeadline(title: string): string[] {
  const keys: string[] = [];
  for (const { entry, res } of compiled) {
    if (!res.some((r) => r.test(title))) continue;
    if (entry.strict && !BREACH_RE.test(title)) continue;
    keys.push(vendorKey(entry.slug));
  }
  return keys;
}

/** Custom (user-typed) tools: exact name in the headline AND breach language, to stay quiet. */
export function matchCustom(title: string, names: string[]): string[] {
  if (!names.length || !BREACH_RE.test(title)) return [];
  return names.filter((n) => new RegExp(`(?<![\\w.-])${escapeRe(n)}(?![\\w-])`, "i").test(title)).map((n) => `custom:${n}`);
}

export function matchKev(vendorProject: string, product: string): string[] {
  return CATALOG.filter((e) => e.kev && e.kev.vendor.test(vendorProject.trim()) && (!e.kev.product || e.kev.product.test(product))).map((e) =>
    vendorKey(e.slug),
  );
}

const npmToVendors = new Map<string, string[]>();
for (const e of CATALOG) for (const p of e.npm ?? []) npmToVendors.set(p, [...(npmToVendors.get(p) ?? []), vendorKey(e.slug)]);

/** Stack keys affected by an advisory on an npm package: the package itself plus tools it belongs to. */
export function keysForNpmPackage(name: string): string[] {
  return [npmKey(name), ...(npmToVendors.get(name) ?? [])];
}

/** Every npm package implied by a set of stack keys (for targeted advisory queries). */
export function npmPackagesForKeys(keys: string[]): string[] {
  const out = new Set<string>();
  for (const k of keys) {
    if (k.startsWith("npm:")) out.add(k.slice(4));
    else if (k.startsWith("vendor:")) for (const p of CATALOG.find((e) => vendorKey(e.slug) === k)?.npm ?? []) out.add(p);
  }
  return [...out];
}
