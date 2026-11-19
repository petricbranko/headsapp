import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { cols } from "@/lib/db";

export const GET = api(async ({ req, user }) => {
  const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 20) || 20));
  const { messages } = await cols();
  const list = await messages.find({ userId: user._id, kind: { $ne: "verify" } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return NextResponse.json({ messages: list.map((m) => ({ body: m.body, provider: m.provider, status: m.status, kind: m.kind, createdAt: m.createdAt })) });
});
