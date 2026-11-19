import "server-only";

const UA = "HeadsApp/0.1 (+https://headsapp.dev; security alert monitor)";
const MAX_BYTES = 8 * 1024 * 1024;

/** Fetch with timeout, size cap and a polite user agent. Only ever called with fixed, trusted URLs. */
export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const { timeoutMs = 15000, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { "user-agent": UA, accept: "*/*", ...(headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${new URL(url).host}`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new Error(`response too large from ${new URL(url).host}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error(`response too large from ${new URL(url).host}`);
  return text;
}

export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const text = await fetchText(url, { ...init, headers: { accept: "application/json", ...(init.headers ?? {}) } });
  return JSON.parse(text) as T;
}

/** Run async tasks with a concurrency limit. */
export async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = { status: "fulfilled", value: await fn(items[idx]) };
      } catch (reason) {
        out[idx] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
