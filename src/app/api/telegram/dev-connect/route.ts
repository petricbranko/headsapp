import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { env } from "@/lib/env";
import { messagingMode } from "@/lib/telegram";
import { linkTelegram } from "@/lib/telegram-bot";

/** Local mode only (no bot token, not production): pretend the user pressed Start. */
export const POST = api(async ({ user }) => {
  if (env.isProd || messagingMode() !== "console") return NextResponse.json({ error: "Not found" }, { status: 404 });
  await linkTelegram(user._id, { chatId: 0, username: "local_dev", firstName: user.name ?? "Local" });
  return NextResponse.json({ ok: true });
});
