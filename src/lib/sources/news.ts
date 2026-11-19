import "server-only";
import { XMLParser } from "fast-xml-parser";
import { fetchText, pool } from "./http";
import { matchHeadline, matchCustom, SECURITY_RE } from "./match";
import type { RawIncident, SourceResult } from "./types";
import { labelForKey } from "../catalog";
import { stripHtml, truncate } from "../text";
import { createHash } from "node:crypto";

export const NEWS_FEEDS = [
  { id: "bleepingcomputer", name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { id: "thehackernews", name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { id: "securityweek", name: "SecurityWeek", url: "https://www.securityweek.com/feed/" },
  { id: "therecord", name: "The Record", url: "https://therecord.media/feed" },
  { id: "krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", processEntities: true, htmlEntities: true });

interface Item {
  title: string;
  link: string;
  date: Date;
  description: string;
}

function asArray<T>(x: T | T[] | undefined): T[] {
  return x === undefined ? [] : Array.isArray(x) ? x : [x];
}

function text(x: unknown): string {
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (x && typeof x === "object" && "#text" in x) return String((x as Record<string, unknown>)["#text"]);
  return "";
}

export function parseFeed(xml: string): Item[] {
  const doc = parser.parse(xml);
  const rss = asArray(doc?.rss?.channel?.item);
  if (rss.length) {
    return rss.map((i: Record<string, unknown>) => ({
      title: stripHtml(text(i.title)),
      link: text(i.link).trim(),
      date: new Date(text(i.pubDate) || Date.now()),
      description: stripHtml(text(i.description) || text(i["content:encoded"])),
    }));
  }
  return asArray(doc?.feed?.entry).map((e: Record<string, unknown>) => {
    const links = asArray(e.link as Record<string, string> | Record<string, string>[]);
    return {
      title: stripHtml(text(e.title)),
      link: links.find((l) => !l["@rel"] || l["@rel"] === "alternate")?.["@href"] ?? "",
      date: new Date(text(e.published) || text(e.updated) || Date.now()),
      description: stripHtml(text(e.summary) || text(e.content)),
    };
  });
}

const CVE_RE = /CVE-\d{4}-\d{4,}/g;
/** Weekly roundups mention many vendors in passing: never alert on them. */
const ROUNDUP_RE = /\b(weekly recap|week in review|threatsday|this week in|roundup|\+\s?\d+ more stories|newsletter|podcast|webinar)\b/i;

/** Security news. Only headlines that name a tool in the catalog are kept. */
export async function fetchNews(customNames: string[] = []): Promise<SourceResult> {
  const incidents: RawIncident[] = [];
  const results = await pool(NEWS_FEEDS, 5, async (f) => ({ f, items: parseFeed(await fetchText(f.url)) }));
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === NEWS_FEEDS.length) throw new Error(String((failed[0] as PromiseRejectedResult).reason));
  const since = Date.now() - 30 * 864e5;
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { f, items } = r.value;
    for (const it of items) {
      if (!it.title || !/^https:\/\//.test(it.link)) continue;
      it.description = it.description.replace(/\s*\[(\.\.\.|…)\]\s*$/, "…").replace(/\s*The post .* appeared first on .*$/, "");
      if (Number.isNaN(it.date.getTime()) || it.date.getTime() < since) continue;
      if (ROUNDUP_RE.test(it.title)) continue;
      const targets = [...matchHeadline(it.title), ...matchCustom(it.title, customNames)];
      if (!targets.length) continue;
      if (!SECURITY_RE.test(`${it.title} ${it.description}`)) continue;
      const name = labelForKey(targets[0]);
      const severe = /\b(breach(ed)?|hacked|compromised|stolen|zero-day|actively exploited|data leak|supply[- ]chain)\b/i.test(it.title);
      incidents.push({
        sourceId: `news:${createHash("sha256").update(it.link).digest("hex").slice(0, 24)}`,
        source: "news",
        sourceName: f.name,
        title: it.title,
        whatHappened: truncate(it.description || it.title, 360),
        whatToDo: [`Read the report and check ${name}'s official statement`, `If ${name} confirms exposure, rotate API keys, tokens and webhook secrets you use with it`, "Review recent account and audit logs for unusual activity"],
        url: it.link,
        severity: severe ? "critical" : "high",
        publishedAt: it.date,
        cves: [...new Set(`${it.title} ${it.description}`.match(CVE_RE) ?? [])],
        targets,
      });
    }
  }
  return { id: "news", name: "Security news", incidents };
}
