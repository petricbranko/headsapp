import { NextResponse } from "next/server";

const auth0Configured = Boolean(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET && process.env.AUTH0_SECRET);

export async function proxy(request: Request) {
  if (!auth0Configured) return NextResponse.next();
  // Mounts /auth/login, /auth/callback, /auth/logout and keeps rolling sessions fresh.
  const { auth0 } = await import("./lib/auth0");
  return auth0().middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logos/|sitemap.xml|robots.txt).*)"],
};
