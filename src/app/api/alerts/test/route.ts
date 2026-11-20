import { NextResponse } from "next/server";
import { api, HttpError } from "@/lib/auth";
import { sendTestAlert } from "@/lib/alerts";
import { hit } from "@/lib/rate";
import { canReceiveAlerts } from "@/edition";

export const POST = api(async ({ user }) => {
  if (!user.telegram) throw new HttpError(400, "Connect Telegram first.");
  if (!(await canReceiveAlerts(user))) throw new HttpError(402, "Alerts need an active subscription.");
  if (!(await hit(`test:${user._id}`, 5, 3600))) throw new HttpError(429, "That's plenty of test alerts for now. Try again later.");
  const msg = await sendTestAlert(user);
  if (msg.status === "failed") throw new HttpError(502, "Telegram couldn't deliver it. If you blocked the bot, connect Telegram again in Settings.");
  return NextResponse.json({ message: { body: msg.body, provider: msg.provider, status: msg.status, createdAt: msg.createdAt } });
});
