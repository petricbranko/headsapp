import { NextResponse, after } from "next/server";
import { z } from "zod";
import { api, readJson, HttpError } from "@/lib/auth";
import { cols } from "@/lib/db";
import { catalogEntry, isValidNpmName } from "@/lib/catalog";
import { stackLimit } from "@/edition";
import type { StackItem } from "@/lib/types";
import { backfillPackages } from "@/lib/ingest";
import { fetchText } from "@/lib/sources/http";

const Body = z.object({ keys: z.array(z.string().max(240)).max(500) });

async function npmExists(name: string) {
  try {
    await fetchText(`https://registry.npmjs.org/${name.replace("/", "%2F")}`, { method: "HEAD", timeoutMs: 5000 } as RequestInit);
    return true;
  } catch {
    return false;
  }
}

/** Replace the whole stack (the picker sends the full selection). */
export const PUT = api(async ({ req, user }) => {
  const { keys } = Body.parse(await readJson(req));
  const unique = [...new Set(keys)];
  const prev = new Map(user.stack.map((s) => [s.key, s]));
  const items: StackItem[] = [];
  for (const key of unique) {
    if (prev.has(key)) {
      items.push(prev.get(key)!);
      continue;
    }
    if (key.startsWith("vendor:")) {
      const e = catalogEntry(key.slice(7));
      if (!e) throw new HttpError(400, `Unknown tool: ${key.slice(7)}`);
      items.push({ key, kind: "vendor", name: e.name, addedAt: new Date() });
    } else if (key.startsWith("npm:")) {
      const name = key.slice(4);
      if (!isValidNpmName(name)) throw new HttpError(400, `Invalid npm package name: ${name}`);
      if (!(await npmExists(name))) throw new HttpError(400, `Couldn't find "${name}" on npm`);
      items.push({ key, kind: "npm", name, addedAt: new Date() });
    } else throw new HttpError(400, "Invalid item");
  }
  const { max, upgradeHint } = await stackLimit(user);
  if (items.length > max) throw new HttpError(402, upgradeHint ?? `You can watch up to ${max} tools.`);

  const { users } = await cols();
  await users.updateOne({ _id: user._id }, { $set: { stack: items, updatedAt: new Date() } });
  const added = items.filter((i) => !prev.has(i.key)).map((i) => i.key);
  if (added.length) after(() => backfillPackages(added).catch((e) => console.warn("[backfill]", e.message)));
  return NextResponse.json({ stack: items });
});
