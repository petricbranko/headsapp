import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { cols } from "@/lib/db";

export const POST = api(async ({ user }) => {
  const { users } = await cols();
  await users.updateOne({ _id: user._id }, { $unset: { telegram: "", pendingTelegram: "" }, $set: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
});
