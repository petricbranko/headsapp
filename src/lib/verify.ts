import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { env, getSessionSecret, twilioVerifyConfigured } from "./env";
import { cols } from "./db";
import type { UserDoc } from "./types";
import { hit } from "./rate";
import { sendWhatsApp } from "./whatsapp";

export class VerifyError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "VerifyError";
  }
}

export function normalizePhone(input: string, country?: string): string | null {
  const p = parsePhoneNumberFromString(input.trim(), (country?.toUpperCase() as CountryCode) || undefined);
  if (!p || !p.isValid()) return null;
  return p.number; // E.164
}

export function verifyMode(): "twilio" | "console" | "unavailable" {
  if (twilioVerifyConfigured()) return "twilio";
  return env.isProd ? "unavailable" : "console";
}

function codeHash(userId: string, e164: string, code: string) {
  return createHmac("sha256", getSessionSecret()).update(`${userId}:${e164}:${code}`).digest("hex");
}

async function twilioVerify(path: "Verifications" | "VerificationCheck", form: Record<string, string>) {
  const t = env.twilio;
  const res = await fetch(`https://verify.twilio.com/v2/Services/${t.verifyServiceSid}/${path}`, {
    method: "POST",
    headers: { authorization: "Basic " + Buffer.from(`${t.accountSid}:${t.authToken}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 404 on check = expired/used; don't leak provider details to the client.
    if (path === "VerificationCheck" && res.status === 404) throw new VerifyError("That code expired. Send a new one.");
    console.error("[verify] twilio error", res.status, data?.message);
    throw new VerifyError("Could not reach WhatsApp right now. Try again in a minute.", 502);
  }
  return data as { status: string };
}

/** Step 1: send a 6-digit code to the number over WhatsApp. Returns the code only in local console mode. */
export async function startVerification(user: UserDoc, rawPhone: string, country?: string): Promise<{ e164: string; devCode?: string }> {
  const e164 = normalizePhone(rawPhone, country);
  if (!e164) throw new VerifyError("That doesn't look like a valid phone number. Include your country code, like +1 415 555 0100.");
  const mode = verifyMode();
  if (mode === "unavailable") throw new VerifyError("WhatsApp verification isn't configured on this server.", 503);

  const uid = user._id!.toString();
  if (!(await hit(`verify:user:${uid}`, 5, 3600)) || !(await hit(`verify:phone:${e164}`, 5, 3600))) {
    throw new VerifyError("Too many codes requested. Try again in an hour.", 429);
  }

  const { users } = await cols();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  if (mode === "twilio") {
    await twilioVerify("Verifications", { To: e164, Channel: "whatsapp" });
    await users.updateOne({ _id: user._id }, { $set: { pendingPhone: { e164, expiresAt, attempts: 0 }, updatedAt: new Date() } });
    return { e164 };
  }

  const code = String(randomInt(100000, 1000000));
  await users.updateOne({ _id: user._id }, { $set: { pendingPhone: { e164, codeHash: codeHash(uid, e164, code), expiresAt, attempts: 0 }, updatedAt: new Date() } });
  await sendWhatsApp({ userId: user._id, to: e164, kind: "verify", body: `Your HeadsApp code is *${code}*. It expires in 10 minutes.` });
  return { e164, devCode: code };
}

/** Step 2: check the code. On success the number becomes the user's alert destination. */
export async function checkVerification(user: UserDoc, code: string): Promise<string> {
  const p = user.pendingPhone;
  if (!p || p.expiresAt < new Date()) throw new VerifyError("That code expired. Send a new one.");
  if (p.attempts >= 5) throw new VerifyError("Too many attempts. Send a new code.", 429);
  if (!/^\d{4,10}$/.test(code)) throw new VerifyError("Enter the 6-digit code.");

  const { users } = await cols();
  await users.updateOne({ _id: user._id }, { $inc: { "pendingPhone.attempts": 1 } });

  let ok = false;
  if (verifyMode() === "twilio") {
    const r = await twilioVerify("VerificationCheck", { To: p.e164, Code: code });
    ok = r.status === "approved";
  } else if (p.codeHash) {
    const a = Buffer.from(codeHash(user._id!.toString(), p.e164, code), "hex");
    const b = Buffer.from(p.codeHash, "hex");
    ok = a.length === b.length && timingSafeEqual(a, b);
  }
  if (!ok) throw new VerifyError("That code isn't right. Check the latest message and try again.");

  await users.updateOne({ _id: user._id }, { $set: { phone: { e164: p.e164, verifiedAt: new Date() }, updatedAt: new Date() }, $unset: { pendingPhone: "" } });
  return p.e164;
}
