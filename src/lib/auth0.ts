import "server-only";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { env } from "./env";

let client: Auth0Client | null = null;

/** Lazily created so local dev (no Auth0 env vars) never touches the SDK. */
export function auth0(): Auth0Client {
  if (!env.auth0Configured) throw new Error("Auth0 is not configured");
  if (!client) {
    client = new Auth0Client({
      appBaseUrl: process.env.APP_BASE_URL,
      signInReturnToPath: "/dashboard",
      session: { rolling: true, absoluteDuration: 60 * 60 * 24 * 14, inactivityDuration: 60 * 60 * 24 * 3 },
      authorizationParameters: { scope: "openid profile email" },
    });
  }
  return client;
}
