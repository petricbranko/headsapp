import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/auth";
import { startVerification } from "@/lib/verify";

const Body = z.object({ phone: z.string().min(4).max(32), country: z.string().length(2).optional() });

export const POST = api(async ({ req, user }) => {
  const { phone, country } = Body.parse(await readJson(req));
  return NextResponse.json(await startVerification(user, phone, country));
});
