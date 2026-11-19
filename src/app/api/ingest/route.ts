import { NextResponse } from "next/server";
import { api, HttpError } from "@/lib/auth";
import { runIngest } from "@/lib/ingest";
import { hit } from "@/lib/rate";

/** "Check now" button. Globally rate limited so it can't be used to hammer sources. */
export const POST = api(async () => {
  if (!(await hit("ingest:manual", 1, 60))) throw new HttpError(429, "Sources were checked less than a minute ago.");
  const summary = await runIngest();
  return NextResponse.json(summary);
});
