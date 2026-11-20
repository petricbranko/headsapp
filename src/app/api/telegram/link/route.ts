import { NextResponse } from "next/server";
import { api, HttpError } from "@/lib/auth";
import { env } from "@/lib/env";
import { messagingMode } from "@/lib/telegram";
import { createConnectLink } from "@/lib/telegram-bot";
import { hit } from "@/lib/rate";

/** One-time t.me link that connects the user's Telegram when they press Start. */
export const POST = api(async ({ user }) => {
  if (messagingMode() === "console") {
    if (env.isProd) throw new HttpError(503, "Telegram isn't configured on this server. Set TELEGRAM_BOT_TOKEN.");
    return NextResponse.json({ mode: "console", issuedAt: new Date().toISOString() });
  }
  if (!(await hit(`tg:link:${user._id}`, 30, 3600))) throw new HttpError(429, "Too many attempts. Try again in an hour.");
  try {
    return NextResponse.json({ mode: "telegram", ...(await createConnectLink(user)) });
  } catch (e) {
    console.error("[telegram] link failed:", (e as Error).message);
    throw new HttpError(502, "Couldn't reach Telegram. Try again in a minute.");
  }
});
