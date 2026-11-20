import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env, telegramConfigured } from "./env";
import { cols } from "./db";
import type { TelegramLink, UserDoc } from "./types";
import { botUsername, escapeHtml, reply, tg, TelegramError } from "./telegram";
import { sendTestAlert } from "./alerts";
import { canReceiveAlerts } from "@/edition";

/*
 * Connecting Telegram:
 *  1. The app creates a one-time token and shows a t.me/<bot>?start=<token> link.
 *  2. The user presses Start; Telegram sends us "/start <token>" from their private chat.
 *  3. We match the token (stored hashed, 15 minute expiry), save the chat id and send a test alert.
 * Pressing Start proves the person in that chat clicked the link from their account, so no codes are needed.
 *
 * Updates arrive by long polling (no public webhook needed, works behind NAT and on localhost).
 * Run a single app instance per bot token: Telegram allows only one getUpdates consumer.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Create a fresh connect link for this user. */
export async function createConnectLink(user: UserDoc): Promise<{ url: string; issuedAt: string }> {
  const token = randomBytes(24).toString("base64url"); // 32 chars, allowed in /start payloads
  const issuedAt = new Date();
  const { users } = await cols();
  const entry = { tokenHash: hashToken(token), expiresAt: new Date(issuedAt.getTime() + TOKEN_TTL_MS) };
  // Keep the 5 newest links valid: two tabs, or two requests racing, must not invalidate each other.
  await users.updateOne({ _id: user._id }, { $push: { telegramTokens: { $each: [entry], $slice: -5 } }, $set: { updatedAt: issuedAt } });
  return { url: `https://t.me/${await botUsername()}?start=${token}`, issuedAt: issuedAt.toISOString() };
}

/** Save the chat as the user's alert destination and send the first (test) alert. */
export async function linkTelegram(userId: UserDoc["_id"], link: Omit<TelegramLink, "connectedAt">): Promise<void> {
  const { users } = await cols();
  const fresh = await users.findOneAndUpdate(
    { _id: userId },
    { $set: { telegram: { ...link, connectedAt: new Date() }, "prefs.alertsEnabled": true, updatedAt: new Date() }, $unset: { telegramTokens: "" } },
    { returnDocument: "after" },
  );
  if (fresh && (await canReceiveAlerts(fresh))) await sendTestAlert(fresh);
}

interface TgUser { id: number; is_bot?: boolean; first_name?: string; username?: string }
interface TgChat { id: number; type: string }
interface Update {
  update_id: number;
  message?: { chat: TgChat; from?: TgUser; text?: string };
  my_chat_member?: { chat: TgChat; new_chat_member: { status: string } };
}

const appLink = () => `<a href="${escapeHtml(env.appUrl)}">${escapeHtml(env.appUrl.replace(/^https?:\/\//, ""))}</a>`;

export async function handleUpdate(u: Update): Promise<void> {
  const { users } = await cols();

  // The user blocked the bot: forget the chat so the app asks them to reconnect.
  if (u.my_chat_member) {
    const { chat, new_chat_member } = u.my_chat_member;
    if (chat.type === "private" && new_chat_member.status === "kicked") {
      await users.updateMany({ "telegram.chatId": chat.id }, { $unset: { telegram: "" }, $set: { updatedAt: new Date() } });
    }
    return;
  }

  const msg = u.message;
  if (!msg?.text || !msg.from || msg.from.is_bot) return;
  if (msg.chat.type !== "private") return; // alerts are personal; ignore groups
  const chatId = msg.chat.id;
  const [cmd, payload] = msg.text.trim().split(/\s+/, 2);
  const command = cmd.toLowerCase().replace(/@\w+$/, "");

  if (command === "/start" && payload) {
    const user = await users.findOne({ telegramTokens: { $elemMatch: { tokenHash: hashToken(payload), expiresAt: { $gt: new Date() } } } });
    if (!user) {
      await reply(chatId, `This link has expired. Open ${appLink()} and click <b>Connect Telegram</b> again.`);
      return;
    }
    await reply(chatId, "✅ <b>Connected.</b> You'll get a message here when a security incident hits your stack. Send /stop anytime to pause.");
    await linkTelegram(user._id, { chatId, username: msg.from.username, firstName: msg.from.first_name });
    return;
  }

  const linked = await users.countDocuments({ "telegram.chatId": chatId });
  if (command === "/start") {
    if (!linked) {
      await reply(chatId, `Hi! I send security alerts for the tools you use. Connect this chat from ${appLink()}.`);
      return;
    }
    await users.updateMany({ "telegram.chatId": chatId }, { $set: { "prefs.alertsEnabled": true, updatedAt: new Date() } });
    await reply(chatId, "Alerts are on. Send /stop to pause them.");
    return;
  }
  if (command === "/stop") {
    if (linked) await users.updateMany({ "telegram.chatId": chatId }, { $set: { "prefs.alertsEnabled": false, updatedAt: new Date() } });
    await reply(chatId, linked ? "Alerts paused. Send /start to turn them back on." : `This chat isn't connected. Connect it from ${appLink()}.`);
    return;
  }
  await reply(chatId, linked ? "I only send alerts. Manage everything at " + appLink() + "." : `Connect this chat from ${appLink()}.`);
}

const g = globalThis as typeof globalThis & { __headsappBot?: boolean };
const OFFSET_KEY = "telegram:offset";

/** Start long polling for bot updates (from instrumentation.ts). Safe to call more than once. */
export function startTelegramBot() {
  if (g.__headsappBot || !telegramConfigured()) return;
  g.__headsappBot = true;
  void poll();
}

async function poll() {
  const { kv } = await cols();
  let offset = Number((await kv.findOne({ _id: OFFSET_KEY }))?.value ?? 0) || undefined;
  await setup().catch((e) => console.error("[telegram] setup failed:", (e as Error).message));
  console.log(`[telegram] bot @${await botUsername().catch(() => "?")} is listening`);
  let backoff = 1000;
  for (;;) {
    try {
      const updates = await tg<Update[]>("getUpdates", { offset, timeout: 25, allowed_updates: ["message", "my_chat_member"] }, 35000);
      for (const u of updates) {
        offset = u.update_id + 1;
        await handleUpdate(u).catch((e) => console.error("[telegram] update failed:", (e as Error).message));
      }
      if (updates.length) await kv.updateOne({ _id: OFFSET_KEY }, { $set: { value: offset, updatedAt: new Date() } }, { upsert: true });
      backoff = 1000;
    } catch (e) {
      const conflict = e instanceof TelegramError && e.code === 409;
      console.error(`[telegram] ${conflict ? "another process is using this bot token (run one instance per bot)" : (e as Error).message}`);
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 60000);
    }
  }
}

/** Polling and webhooks are exclusive, so clear any webhook; also publish the command menu. */
async function setup() {
  await tg("deleteWebhook");
  await tg("setMyCommands", {
    commands: [
      { command: "start", description: "Turn alerts on" },
      { command: "stop", description: "Pause alerts" },
    ],
  });
  await tg("setMyShortDescription", { short_description: "Security alerts for the tools in your stack." });
}
