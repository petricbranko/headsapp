import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { telegramLabel } from "@/lib/telegram";

/** Polled by the connect screen while the user presses Start in Telegram. */
export const GET = api(async ({ user }) => {
  const t = user.telegram;
  return NextResponse.json({ connected: Boolean(t), connectedAt: t?.connectedAt ?? null, label: telegramLabel(t) || null });
});
