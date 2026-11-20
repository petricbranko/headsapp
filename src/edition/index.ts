import "server-only";
import type { UserDoc } from "@/lib/types";

/** Open-source edition: no billing, no limits. */
export const edition = {
  id: "oss" as "oss" | "cloud",
  name: "HeadsApp",
  /** Path the logo links to when signed out. */
  homePath: "/login",
  /** Whether onboarding includes a subscribe step (shown even after paying, so steps stay stable). */
  billing: false as boolean,
};

/** Called before adding stack items. Return a message to block (e.g. plan limits). */
export async function stackLimit(_user: UserDoc): Promise<{ max: number; upgradeHint?: string }> {
  return { max: 500 };
}

/** Short plan label shown in the app (null hides it). */
export function planLabel(_user: UserDoc): string | null {
  return null;
}

/** Whether this user may receive alerts (cloud: active subscription). */
export async function canReceiveAlerts(_user: UserDoc): Promise<boolean> {
  return true;
}

export interface Paywall {
  title: string;
  description: string;
  price: string;
  per: string;
  features: string[];
  cta: string;
  /** Optional fine print under the button (e.g. trial terms). */
  note?: string;
  /** POST endpoint that returns { url } to redirect to (checkout). */
  endpoint: string;
}

/** A required payment step. null = no paywall (open source). */
export async function paywall(_user: UserDoc): Promise<Paywall | null> {
  return null;
}

/** Called before an account is deleted (cloud: cancels the subscription). Throw to stop the deletion. */
export async function beforeDeleteAccount(_user: UserDoc): Promise<void> {}
