import { NextResponse } from "next/server";
import { authMode } from "@/lib/env";
import { DEV_COOKIE } from "@/lib/session";

export async function GET(req: Request) {
  if (authMode() === "auth0") return NextResponse.redirect(new URL("/auth/logout", req.url));
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(DEV_COOKIE);
  return res;
}
