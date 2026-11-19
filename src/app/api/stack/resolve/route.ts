import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson, HttpError } from "@/lib/auth";
import { tokenize, resolveTokens } from "@/lib/resolve";
import { hit } from "@/lib/rate";

const Body = z.object({ text: z.string().max(200_000) });

/** Preview what pasted text / CSV / package.json maps to. Nothing is saved. */
export const POST = api(async ({ req, user }) => {
  if (!(await hit(`resolve:${user._id}`, 30, 600))) throw new HttpError(429, "Too many imports. Try again in a few minutes.");
  const { text } = Body.parse(await readJson(req));
  const tokens = tokenize(text);
  if (!tokens.length) throw new HttpError(400, "Nothing to import. Paste a list, a CSV or a package.json.");
  return NextResponse.json(await resolveTokens(tokens));
});
