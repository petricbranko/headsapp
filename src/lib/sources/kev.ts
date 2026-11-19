import "server-only";
import { fetchJson } from "./http";
import { matchKev } from "./match";
import type { RawIncident, SourceResult } from "./types";
import { truncate } from "../text";

interface Kev {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  knownRansomwareCampaignUse: string;
  notes: string;
}

const URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

/** CISA KEV: vulnerabilities confirmed as actively exploited. The highest-signal source there is. */
export async function fetchKev(): Promise<SourceResult> {
  const data = await fetchJson<{ vulnerabilities: Kev[] }>(URL, { timeoutMs: 30000 });
  const since = Date.now() - 365 * 864e5;
  const incidents: RawIncident[] = [];
  for (const v of data.vulnerabilities) {
    const added = new Date(`${v.dateAdded}T00:00:00Z`);
    if (added.getTime() < since) continue;
    const targets = matchKev(v.vendorProject, v.product);
    if (!targets.length) continue;
    const action = truncate(v.requiredAction.split(/(?<=\.)\s/)[0] ?? v.requiredAction, 160);
    const ransomware = v.knownRansomwareCampaignUse === "Known";
    incidents.push({
      sourceId: `kev:${v.cveID}`,
      source: "kev",
      sourceName: "CISA Known Exploited Vulnerabilities",
      title: `${v.vulnerabilityName} (${v.cveID})`,
      whatHappened: truncate(`${v.shortDescription} Attackers are actively exploiting this${ransomware ? ", including in ransomware campaigns" : ""}.`, 420),
      whatToDo: [`Patch ${v.product} now: this is being exploited in the wild`, action, `Check your servers and images for ${v.product} versions listed in the advisory`],
      url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
      severity: "critical",
      publishedAt: added,
      cves: [v.cveID],
      targets,
    });
  }
  return { id: "kev", name: "CISA KEV", incidents };
}
