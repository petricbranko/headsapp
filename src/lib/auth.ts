import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authMode, env } from "./env";
import { auth0 } from "./auth0";
import { DEV_COOKIE, decodeDevSession } from "./session";
import { cols } from "./db";
import type { UserDoc } from "./types";

export interface Identity {
  sub: string;
  email?: string;
  name?: string;
}

export async function getIdentity(): Promise<Identity | null> {
  const mode = authMode();
  if (mode === "auth0") {
    const s = await auth0().getSession();
    if (!s?.user?.sub) return null;
    return { sub: s.user.sub, email: s.user.email, name: s.user.name };
  }
  if (mode === "dev") {
    const s = decodeDevSession((await cookies()).get(DEV_COOKIE)?.value);
    return s ? { sub: s.sub, email: s.email, name: s.name } : null;
  }
  return null;
}

/** Current user, created on first sight. */
export async function getUser(): Promise<UserDoc | null> {
  const id = await getIdentity();
  if (!id) return null;
  const { users } = await cols();
  const now = new Date();
  const user = await users.findOneAndUpdate(
    { authSub: id.sub },
    {
      $setOnInsert: { authSub: id.sub, stack: [], prefs: { alertsEnabled: true, minSeverity: "high" }, createdAt: now },
      $set: { email: id.email, name: id.name, updatedAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  return user;
}

/** For server components: redirect to login when signed out. */
export async function requireUser(): Promise<UserDoc> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * CSRF defence for JSON APIs: state-changing requests must come from our own origin.
 * (Cookies are SameSite=Lax too; this is belt and braces.)
 */
async function checkOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const allowed = new Set([env.appUrl.replace(/\/$/, "")]);
  if (host) {
    allowed.add(`https://${host}`);
    if (!env.isProd) allowed.add(`http://${host}`);
  }
  if (!origin || !allowed.has(origin)) throw new HttpError(403, "Bad origin");
  const ct = req.headers.get("content-type") ?? "";
  if (req.method !== "DELETE" && req.headers.get("content-length") !== "0" && !ct.includes("application/json")) {
    throw new HttpError(415, "Expected JSON");
  }
}

type Handler<C> = (ctx: { req: Request; user: UserDoc; params: C }) => Promise<Response>;

/** Wrap an API route: origin check, auth, JSON errors. */
export function api<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: { params: Promise<C> }) => {
    try {
      await checkOrigin(req);
      const user = await getUser();
      if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      return await handler({ req, user, params: ctx?.params ? await ctx.params : (undefined as C) });
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      const e = err as { status?: number; message?: string; name?: string };
      if (e.name === "ZodError") return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      console.error("[api]", err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  const text = await req.text();
  if (text.length > 250_000) throw new HttpError(413, "Too large");
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
