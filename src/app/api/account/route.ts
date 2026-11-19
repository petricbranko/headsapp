import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { cols } from "@/lib/db";

/** Delete the account and everything tied to it. */
export const DELETE = api(async ({ user }) => {
  const { users, alerts, messages, states } = await cols();
  await Promise.all([alerts.deleteMany({ userId: user._id }), messages.deleteMany({ userId: user._id }), states.deleteMany({ userId: user._id })]);
  await users.deleteOne({ _id: user._id });
  return NextResponse.json({ ok: true });
});
