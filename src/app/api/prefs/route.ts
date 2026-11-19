import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/auth";
import { cols } from "@/lib/db";

const Body = z.object({
  alertsEnabled: z.boolean().optional(),
  minSeverity: z.enum(["critical", "high", "medium"]).optional(),
});

export const PATCH = api(async ({ req, user }) => {
  const b = Body.parse(await readJson(req));
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (b.alertsEnabled !== undefined) set["prefs.alertsEnabled"] = b.alertsEnabled;
  if (b.minSeverity) set["prefs.minSeverity"] = b.minSeverity;
  const { users } = await cols();
  await users.updateOne({ _id: user._id }, { $set: set });
  return NextResponse.json({ ok: true });
});
