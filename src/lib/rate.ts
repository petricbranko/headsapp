import "server-only";
import { cols } from "./db";

/** Fixed-window rate limiter stored in Mongo (works across instances). Returns true if allowed. */
export async function hit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const { rates } = await cols();
  const now = new Date();
  const r = await rates.findOneAndUpdate({ _id: key, expiresAt: { $gt: now } }, { $inc: { count: 1 } }, { returnDocument: "after" });
  if (r) return r.count <= limit;
  await rates.updateOne({ _id: key }, { $set: { count: 1, expiresAt: new Date(now.getTime() + windowSec * 1000) } }, { upsert: true });
  return true;
}
