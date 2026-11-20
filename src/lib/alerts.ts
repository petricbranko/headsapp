import "server-only";
import { cols } from "./db";
import { env } from "./env";
import { SEVERITY_RANK, type AlertDoc, type IncidentDoc, type UserDoc } from "./types";
import { alertParts, formatAlert, formatAlertHtml, sendTelegram } from "./telegram";
import { hit } from "./rate";
import { canReceiveAlerts } from "@/edition";

/** Incidents older than this are shown in the dashboard but never pushed to Telegram. */
export const FRESH_MS = 48 * 3600 * 1000;

export function isFresh(inc: Pick<IncidentDoc, "publishedAt">) {
  return Date.now() - inc.publishedAt.getTime() <= FRESH_MS;
}

/**
 * Deliver one incident to every user whose stack it hits. Noise controls, in order:
 *  - only fresh incidents, only once per user (unique index), only at/above the user's severity
 *  - one alert per CVE per user (the same bug reported by several sources is sent once)
 *  - a daily cap per user; anything over it is still in the dashboard
 */
export async function fanout(inc: IncidentDoc): Promise<{ sent: number; skipped: number }> {
  const { users, alerts } = await cols();
  let sent = 0;
  let skipped = 0;
  if (!inc._id || !isFresh(inc) || !inc.targets.length) return { sent, skipped };

  const cursor = users.find({ "stack.key": { $in: inc.targets }, "prefs.alertsEnabled": true, telegram: { $exists: true } });
  for await (const user of cursor) {
    if (!(await canReceiveAlerts(user))) continue;
    const target = user.stack.find((s) => inc.targets.includes(s.key))!.key;
    const base: AlertDoc = { userId: user._id!, incidentId: inc._id, kind: "incident", target, status: "skipped", createdAt: new Date() };

    if (SEVERITY_RANK[inc.severity] < SEVERITY_RANK[user.prefs.minSeverity]) continue; // below threshold: feed only

    if (inc.cves.length) {
      const { incidents } = await cols();
      const siblings = await incidents.find({ cves: { $in: inc.cves }, _id: { $ne: inc._id } }, { projection: { _id: 1 } }).toArray();
      if (siblings.length && (await alerts.findOne({ userId: user._id, incidentId: { $in: siblings.map((s) => s._id!) }, status: { $in: ["sent", "logged"] } }))) {
        await insertOnce({ ...base, reason: "duplicate" });
        skipped++;
        continue;
      }
    }

    if (!(await hit(`alerts:day:${user._id}:${new Date().toISOString().slice(0, 10)}`, env.maxAlertsPerDay, 86400))) {
      await insertOnce({ ...base, reason: "daily_cap" });
      skipped++;
      continue;
    }

    // Claim the (user, incident) pair before sending so concurrent runs can't double-send.
    if (!(await insertOnce({ ...base, status: "logged", reason: "sending" }))) continue;
    const parts = alertParts(inc, target);
    const msg = await sendTelegram({ userId: user._id, telegram: user.telegram!, body: formatAlert(parts), html: formatAlertHtml(parts), kind: "alert" });
    await alerts.updateOne(
      { userId: user._id, incidentId: inc._id, kind: "incident" },
      msg.error ? { $set: { status: msg.status, reason: msg.error } } : { $set: { status: msg.status }, $unset: { reason: "" } },
    );
    if (msg.status !== "failed") sent++;
  }
  return { sent, skipped };
}

async function insertOnce(a: AlertDoc): Promise<boolean> {
  const { alerts } = await cols();
  try {
    await alerts.insertOne(a);
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false;
    throw e;
  }
}

const SAMPLE: Pick<IncidentDoc, "severity" | "title" | "whatHappened" | "whatToDo" | "url"> = {
  severity: "high",
  title: "Unauthorized access to internal systems (example)",
  whatHappened: "This is an example. When a real incident hits a tool you use, you'll get a message like this within minutes of it being published.",
  whatToDo: ["Rotate the API keys you use with this tool", "Review your account's audit log", "Follow the vendor's status page"],
  url: "https://headsapp.dev",
};

/** Send a test alert. Uses the most recent real incident for the user's stack when there is one. */
export async function sendTestAlert(user: UserDoc) {
  if (!user.telegram) throw new Error("Telegram not connected");
  const { incidents, alerts } = await cols();
  const keys = user.stack.map((s) => s.key);
  const real = keys.length ? await incidents.find({ targets: { $in: keys }, severity: { $in: ["critical", "high"] } }).sort({ publishedAt: -1 }).limit(1).next() : null;
  const target = real ? real.targets.find((t) => keys.includes(t))! : keys[0] ?? "vendor:vercel";
  const parts = alertParts(real ?? SAMPLE, target);
  const msg = await sendTelegram({ userId: user._id, telegram: user.telegram, body: formatAlert(parts, { test: true }), html: formatAlertHtml(parts, { test: true }), kind: "test" });
  await alerts.insertOne({ userId: user._id!, kind: "test", target, status: msg.status, reason: msg.error, createdAt: new Date() });
  return msg;
}
