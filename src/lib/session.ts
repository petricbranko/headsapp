import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./env";

/** Signed cookie used only by local dev login. Auth0 manages its own encrypted session cookie. */
export const DEV_COOKIE = "ha_dev_session";

export interface DevSession {
  sub: string;
  email: string;
  name: string;
  exp: number;
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function encodeDevSession(s: Omit<DevSession, "exp">, ttlSec = 60 * 60 * 24 * 7): string {
  const payload = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeDevSession(token: string | undefined): DevSession | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as DevSession;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}
