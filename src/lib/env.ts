import "server-only";

/** Central place for reading configuration. Every integration has a local fallback mode. */
const isProd = process.env.NODE_ENV === "production";

function val(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  isProd,
  appUrl: val("APP_BASE_URL") ?? `http://localhost:${process.env.PORT ?? 3000}`,
  mongoUri: val("MONGODB_URI") ?? `mongodb://127.0.0.1:${val("MONGO_PORT") ?? "27017"}/headsapp`,
  sessionSecret: val("SESSION_SECRET"),

  auth0Configured: Boolean(val("AUTH0_DOMAIN") && val("AUTH0_CLIENT_ID") && val("AUTH0_CLIENT_SECRET") && val("AUTH0_SECRET")),

  /** Telegram bot token from @BotFather. Without it, messages are logged in the app instead. */
  telegramBotToken: val("TELEGRAM_BOT_TOKEN"),
  /** Bot API base URL; only change it for a self-hosted Bot API server. */
  telegramApiUrl: (val("TELEGRAM_API_URL") ?? "https://api.telegram.org").replace(/\/$/, ""),

  openrouter: {
    apiKey: val("OPENROUTER_API_KEY"),
    model: val("OPENROUTER_MODEL") ?? "anthropic/claude-haiku-4.5",
  },

  githubToken: val("GITHUB_TOKEN"),
  ingestIntervalMinutes: Math.max(5, Number(val("INGEST_INTERVAL_MINUTES") ?? 15)),
  disableScheduler: val("DISABLE_SCHEDULER") === "true",
  maxAlertsPerDay: Number(val("MAX_ALERTS_PER_DAY") ?? 5),
};

export function telegramConfigured() {
  return Boolean(env.telegramBotToken);
}

export type AuthMode = "auth0" | "dev" | "unconfigured";

/**
 * Dev login exists ONLY outside production builds and only when Auth0 is not configured.
 * A production build without Auth0 refuses to authenticate anyone.
 */
export function authMode(): AuthMode {
  if (env.auth0Configured) return "auth0";
  if (!isProd) return "dev";
  return "unconfigured";
}

export function getSessionSecret(): string {
  if (env.sessionSecret && env.sessionSecret.length >= 32) return env.sessionSecret;
  if (isProd) throw new Error("SESSION_SECRET (>=32 chars) is required in production");
  return "headsapp-local-dev-secret-do-not-use-in-production";
}
