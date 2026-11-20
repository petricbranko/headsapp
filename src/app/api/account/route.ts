import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { cols } from "@/lib/db";
import { beforeDeleteAccount } from "@/edition";

/** Delete the account and everything tied to it. */
export const DELETE = api(async ({ user }) => {
  try {
    await beforeDeleteAccount(user);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  const { users, alerts, messages, states } = await cols();
  await Promise.all([alerts.deleteMany({ userId: user._id }), messages.deleteMany({ userId: user._id }), states.deleteMany({ userId: user._id })]);
  await users.deleteOne({ _id: user._id });
  return NextResponse.json({ ok: true });
});
