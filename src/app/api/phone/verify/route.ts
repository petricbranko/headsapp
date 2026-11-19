import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/auth";
import { checkVerification } from "@/lib/verify";
import { cols } from "@/lib/db";
import { sendTestAlert } from "@/lib/alerts";

const Body = z.object({ code: z.string().min(4).max(10) });

/** Verifying the number immediately sends the first (test) alert. */
export const POST = api(async ({ req, user }) => {
  const { code } = Body.parse(await readJson(req));
  const e164 = await checkVerification(user, code);
  const { users } = await cols();
  const fresh = (await users.findOne({ _id: user._id }))!;
  const msg = await sendTestAlert(fresh);
  return NextResponse.json({ e164, message: { body: msg.body, provider: msg.provider, status: msg.status, createdAt: msg.createdAt } });
});
