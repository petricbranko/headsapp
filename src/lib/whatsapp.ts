import "server-only";
import type { ObjectId } from "mongodb";
import { env, twilioMessagingConfigured } from "./env";
import { cols } from "./db";
import type { IncidentDoc, MessageDoc, Severity } from "./types";
import { labelForKey } from "./catalog";
import { maskPhone } from "./text";

const DOT: Record<Severity, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "⚪" };
const SEV: Record<Severity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

export interface AlertParts {
  header: string;
  title: string;
  whatHappened: string;
  whatToDo: string[];
  url: string;
}

export function alertParts(inc: Pick<IncidentDoc, "severity" | "title" | "whatHappened" | "whatToDo" | "url">, target: string): AlertParts {
  return {
    header: `${DOT[inc.severity]} ${SEV[inc.severity]} · ${labelForKey(target)}`,
    title: inc.title,
    whatHappened: inc.whatHappened,
    whatToDo: inc.whatToDo,
    url: inc.url,
  };
}

/** WhatsApp-formatted text (uses *bold*). Kept well under Twilio's 1600 char limit. */
export function formatAlert(p: AlertParts, opts: { test?: boolean } = {}): string {
  const lines = [
    opts.test ? "_Test alert: this is what HeadsApp messages look like._\n" : "",
    `*${p.header}*`,
    p.title,
    "",
    "*What happened*",
    p.whatHappened,
    "",
    "*What to do*",
    ...p.whatToDo.map((s) => `• ${s}`),
    "",
    p.url,
  ].filter((l, i) => !(i === 0 && !l));
  let body = lines.join("\n");
  if (body.length > 1500) body = body.slice(0, 1497) + "…";
  return body;
}

export function messagingMode(): "twilio" | "console" {
  return twilioMessagingConfigured() ? "twilio" : "console";
}

async function twilioSend(to: string, body: string, parts?: AlertParts): Promise<string> {
  const t = env.twilio;
  const form = new URLSearchParams({ From: t.whatsappFrom!, To: `whatsapp:${to}` });
  if (parts && t.alertContentSid) {
    // Approved WhatsApp template (required for business-initiated messages outside the 24h window).
    form.set("ContentSid", t.alertContentSid);
    // WhatsApp rejects template variables containing newlines, tabs or 4+ consecutive spaces.
    const v = (s: string) => s.replace(/\s+/g, " ").trim();
    form.set("ContentVariables", JSON.stringify({ "1": v(parts.header), "2": v(parts.title), "3": v(parts.whatHappened), "4": v(parts.whatToDo.join("; ")), "5": parts.url }));
  } else {
    form.set("Body", body);
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`, {
    method: "POST",
    headers: { authorization: "Basic " + Buffer.from(`${t.accountSid}:${t.authToken}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data?.message ?? "send failed"}`);
  return data.sid as string;
}

/**
 * Send a WhatsApp message. Without Twilio credentials the message is printed to the
 * server console and stored, so it shows up in the app's Messages panel.
 */
export async function sendWhatsApp(input: { userId?: ObjectId; to: string; body: string; kind: MessageDoc["kind"]; parts?: AlertParts }): Promise<MessageDoc> {
  const { messages } = await cols();
  const doc: MessageDoc = { userId: input.userId, to: input.to, kind: input.kind, body: input.body, provider: messagingMode(), status: "logged", createdAt: new Date() };
  if (doc.provider === "console") {
    const bar = "─".repeat(60);
    console.log(`\n${bar}\n[whatsapp:console] to ${maskPhone(input.to)} (${input.kind})\n${bar}\n${input.body}\n${bar}\n`);
  } else {
    try {
      doc.providerId = await twilioSend(input.to, input.body, input.parts);
      doc.status = "sent";
    } catch (err) {
      doc.status = "failed";
      doc.error = (err as Error).message.slice(0, 300);
      console.error("[whatsapp] send failed:", doc.error);
    }
  }
  const r = await messages.insertOne(doc);
  return { ...doc, _id: r.insertedId };
}
