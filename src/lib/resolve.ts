import "server-only";
import { findCatalogMatch, isValidNpmName, isValidCustomName, vendorKey, npmKey, customKey, labelForKey } from "./catalog";
import { fetchText, pool } from "./sources/http";

export interface Resolved {
  input: string;
  key: string;
  name: string;
  kind: "vendor" | "npm" | "custom";
}

/** Turn pasted text, CSV or a package.json into candidate tokens. */
export function tokenize(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  // package.json (or any JSON with dependency maps)
  if (t.startsWith("{")) {
    try {
      const j = JSON.parse(t) as Record<string, unknown>;
      const deps = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((k) =>
        j[k] && typeof j[k] === "object" ? Object.keys(j[k] as object) : [],
      );
      if (deps.length) return deps;
    } catch {
      /* not JSON, fall through */
    }
  }
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  // CSV with a header row: use the "name"/"tool"/"package"/"service" column.
  const header = lines[0]?.toLowerCase().split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const col = header?.findIndex((c) => ["name", "tool", "package", "service", "vendor", "dependency"].includes(c)) ?? -1;
  if (lines.length > 1 && col >= 0) {
    return lines.slice(1).map((l) => (l.split(",")[col] ?? "").trim().replace(/^"|"$/g, "")).filter(Boolean);
  }
  return t
    .split(/[,;\n\t]+/)
    .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, "").replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function stripVersion(s: string) {
  // "next@15.2.3", "react ^19", "lodash 4.17" -> package name
  return s.replace(/(?<=.)@[\^~<>=\d].*$/, "").replace(/\s+[\^~<>=]?\d[\w.\-]*$/, "").trim();
}

async function onNpm(name: string) {
  try {
    await fetchText(`https://registry.npmjs.org/${name.replace("/", "%2F")}`, { method: "HEAD", timeoutMs: 5000 } as RequestInit);
    return true;
  } catch {
    return false;
  }
}

/** Map tokens to stack items: catalog tool > npm package (verified on the registry) > custom name. */
export async function resolveTokens(tokens: string[]): Promise<{ items: Resolved[]; skipped: string[] }> {
  const seen = new Set<string>();
  const unique = tokens.map(stripVersion).filter((t) => t && t.length <= 214 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase())).slice(0, 300);
  const skipped: string[] = [];
  const results = await pool(unique, 8, async (input): Promise<Resolved | null> => {
    const cat = findCatalogMatch(input);
    if (cat) return { input, key: vendorKey(cat.slug), name: cat.name, kind: "vendor" };
    const lower = input.toLowerCase();
    const looksLikePackage = /^@[a-z0-9]|^[a-z0-9][a-z0-9._-]*$/.test(input) && isValidNpmName(lower);
    if (looksLikePackage && (await onNpm(lower))) return { input, key: npmKey(lower), name: lower, kind: "npm" };
    if (isValidCustomName(input)) {
      const name = input.trim().replace(/\s+/g, " ");
      return { input, key: customKey(name), name: labelForKey(customKey(name)), kind: "custom" };
    }
    return null;
  });
  const items: Resolved[] = [];
  const keys = new Set<string>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      if (!keys.has(r.value.key)) {
        keys.add(r.value.key);
        items.push(r.value);
      }
    } else skipped.push(unique[i]);
  });
  return { items, skipped };
}
