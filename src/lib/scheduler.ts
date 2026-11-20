import "server-only";
import { env } from "./env";
import { runIngest } from "./ingest";
import { startTelegramBot } from "./telegram-bot";

const g = globalThis as typeof globalThis & { __headsappScheduler?: NodeJS.Timeout };

/** In-process scheduler (started from instrumentation.ts). A Mongo lock keeps multiple instances from overlapping. */
export function startScheduler() {
  startTelegramBot();
  if (g.__headsappScheduler || env.disableScheduler) return;
  const every = env.ingestIntervalMinutes * 60 * 1000;
  const tick = () => runIngest().catch((e) => console.error("[ingest] run failed:", (e as Error).message));
  setTimeout(tick, 3000);
  g.__headsappScheduler = setInterval(tick, every);
  console.log(`[scheduler] watching sources every ${env.ingestIntervalMinutes} min`);
}
