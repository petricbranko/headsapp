import { NextResponse } from "next/server";
import { authMode, env } from "@/lib/env";
import { DEV_COOKIE, encodeDevSession } from "@/lib/session";

/** Local-only login. Returns 404 whenever Auth0 is configured or in production builds. */
export async function POST(req: Request) {
  if (authMode() !== "dev") return new NextResponse("Not found", { status: 404 });
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== env.appUrl) return new NextResponse("Bad origin", { status: 403 });
  const form = await req.formData().catch(() => null);
  const raw = String(form?.get("email") ?? "").trim().toLowerCase();
  const email = /^[^\s@]{1,64}@[^\s@]{1,100}$/.test(raw) ? raw : "dev@localhost";
  const res = NextResponse.redirect(new URL("/dashboard", req.url), 303);
  res.cookies.set(DEV_COOKIE, encodeDevSession({ sub: `dev|${email}`, email, name: email.split("@")[0] }), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
