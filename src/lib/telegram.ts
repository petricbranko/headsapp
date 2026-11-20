import "server-only";
import type { ObjectId } from "mongodb";
import { env, telegramConfigured } from "./env";
import { cols } from "./db";
import type { IncidentDoc, MessageDoc, Severity, TelegramLink } from "./types";
import { labelForKey } from "./catalog";

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

const TEST_NOTE = "Test alert: this is what HeadsApp messages look like.";

/**
 * Plain-text version with light markup (*bold*, _italic_). Stored with the message and
 * rendered in the app's Alerts log.
 */
export function formatAlert(p: AlertParts, opts: { test?: boolean } = {}): string {
  const lines = [
    ...(opts.test ? [`_${TEST_NOTE}_`, ""] : []),
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
  ];
  let body = lines.join("\n");
  if (body.length > 3000) body = body.slice(0, 2997) + "…";
  return body;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The same alert as Telegram HTML (the only formatting mode that needs no markdown escaping). */
export function formatAlertHtml(p: AlertParts, opts: { test?: boolean } = {}): string {
  const e = escapeHtml;
  const lines = [
    ...(opts.test ? [`<i>${e(TEST_NOTE)}</i>`, ""] : []),
    `<b>${e(p.header)}</b>`,
    e(p.title),
    "",
    "<b>What happened</b>",
    e(p.whatHappened),
    "",
    "<b>What to do</b>",
    ...p.whatToDo.map((s) => `• ${e(s)}`),
    "",
    /^https?:\/\//.test(p.url) ? `<a href="${e(p.url)}">Read the full report</a>` : "",
  ];
  return lines.join("\n").slice(0, 4000); // Telegram's limit is 4096
}

export function messagingMode(): "telegram" | "console" {
  return telegramConfigured() ? "telegram" : "console";
}

/** "@jane", or the first name when the account has no username. */
export function telegramLabel(t?: Pick<TelegramLink, "username" | "firstName"> | null): string {
  if (!t) return "";
  return t.username ? `@${t.username}` : t.firstName || "your Telegram";
}

export class TelegramError extends Error {
  constructor(message: string, public code: number, public retryAfter?: number) {
    super(message);
    this.name = "TelegramError";
  }
}

/** Call the Bot API. The token is only ever in the URL path, never logged. */
export async function tg<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 15000): Promise<T> {
  if (!env.telegramBotToken) throw new TelegramError("Telegram bot isn't configured", 0);
  let res: Response;
  try {
    res = await fetch(`${env.telegramApiUrl}/bot${env.telegramBotToken}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new TelegramError(`Telegram ${method}: ${(err as Error).name === "TimeoutError" ? "timed out" : "network error"}`, 0);
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string; error_code?: number; parameters?: { retry_after?: number } };
  if (!data.ok) throw new TelegramError(`Telegram ${method}: ${data.description ?? res.status}`, data.error_code ?? res.status, data.parameters?.retry_after);
  return data.result as T;
}

const g = globalThis as typeof globalThis & { __headsappBotUsername?: Promise<string> };

/** The bot's @username (needed for t.me links), fetched once. */
export function botUsername(): Promise<string> {
  if (!g.__headsappBotUsername) {
    g.__headsappBotUsername = tg<{ username: string }>("getMe").then((r) => r.username).catch((e) => {
      g.__headsappBotUsername = undefined;
      throw e;
    });
  }
  return g.__headsappBotUsername;
}

async function send(chatId: number, html: string): Promise<number> {
  const params = { chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } };
  try {
    return (await tg<{ message_id: number }>("sendMessage", params)).message_id;
  } catch (err) {
    // Flood control: wait once if Telegram asks for a short pause.
    if (err instanceof TelegramError && err.code === 429 && (err.retryAfter ?? 99) <= 10) {
      await new Promise((r) => setTimeout(r, (err.retryAfter! + 0.5) * 1000));
      return (await tg<{ message_id: number }>("sendMessage", params)).message_id;
    }
    throw err;
  }
}

/** Plain reply from the bot (used for /start, /stop and similar). Errors are logged, not thrown. */
export async function reply(chatId: number, html: string): Promise<void> {
  await send(chatId, html).catch((e) => console.error("[telegram] reply failed:", (e as Error).message));
}

/**
 * Send an alert to a user's Telegram. Without a bot token the message is printed to the
 * server console and stored, so it shows up in the app's Alerts log.
 */
export async function sendTelegram(input: { userId?: ObjectId; telegram: TelegramLink; body: string; html: string; kind: MessageDoc["kind"] }): Promise<MessageDoc> {
  const { messages, users } = await cols();
  const doc: MessageDoc = { userId: input.userId, to: telegramLabel(input.telegram), kind: input.kind, body: input.body, provider: messagingMode(), status: "logged", createdAt: new Date() };
  if (doc.provider === "console") {
    const bar = "─".repeat(60);
    console.log(`\n${bar}\n[telegram:console] to ${doc.to} (${input.kind})\n${bar}\n${input.body}\n${bar}\n`);
  } else {
    try {
      doc.providerId = String(await send(input.telegram.chatId, input.html));
      doc.status = "sent";
    } catch (err) {
      doc.status = "failed";
      doc.error = (err as Error).message.slice(0, 300);
      console.error("[telegram] send failed:", doc.error);
      // 403: the user blocked the bot or deleted their account. Stop trying; the app asks them to reconnect.
      if (err instanceof TelegramError && err.code === 403 && input.userId) {
        await users.updateOne({ _id: input.userId, "telegram.chatId": input.telegram.chatId }, { $unset: { telegram: "" }, $set: { updatedAt: new Date() } });
      }
    }
  }
  const r = await messages.insertOne(doc);
  return { ...doc, _id: r.insertedId };
}
