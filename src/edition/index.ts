import "server-only";
import type { UserDoc } from "@/lib/types";

/** Open-source edition: no billing, no limits. */
export const edition = {
  id: "oss" as "oss" | "cloud",
  name: "HeadsApp",
  /** Path the logo links to when signed out. */
  homePath: "/login",
};

/** Called before adding stack items. Return a message to block (e.g. plan limits). */
export async function stackLimit(_user: UserDoc): Promise<{ max: number; upgradeHint?: string }> {
  return { max: 500 };
}

/** Short plan label shown in the app header (null hides it). */
export function planLabel(_user: UserDoc): string | null {
  return null;
}
