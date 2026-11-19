import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson, HttpError } from "@/lib/auth";
import { cols, ObjectId } from "@/lib/db";

const Body = z.object({ state: z.enum(["fixed", "not_affected", "open"]) });

/** Mark an incident as fixed / not affected for this user (or reopen it). */
export const POST = api<{ id: string }>(async ({ req, user, params }) => {
  if (!ObjectId.isValid(params.id)) throw new HttpError(404, "Not found");
  const { state } = Body.parse(await readJson(req));
  const { incidents, states } = await cols();
  const incidentId = new ObjectId(params.id);
  const keys = user.stack.map((s) => s.key);
  if (!(await incidents.findOne({ _id: incidentId, targets: { $in: keys } }, { projection: { _id: 1 } }))) throw new HttpError(404, "Not found");
  if (state === "open") await states.deleteOne({ userId: user._id, incidentId });
  else await states.updateOne({ userId: user._id!, incidentId }, { $set: { state, updatedAt: new Date() } }, { upsert: true });
  return NextResponse.json({ ok: true, state });
});
