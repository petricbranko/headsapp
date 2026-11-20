"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { call } from "./api";
import { LOGOS } from "@/lib/logos.generated";

type Link = { mode: "telegram"; url: string; issuedAt: string } | { mode: "console"; issuedAt: string };

export function TelegramIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={LOGOS.telegram?.path} fill="currentColor" />
    </svg>
  );
}

/**
 * Connect Telegram: open the bot with a one-time link, press Start, and this component
 * notices on its own (it polls the status) and calls onConnected.
 */
export function TelegramConnect({ onConnected, label = "Open Telegram" }: { onConnected: (label: string) => void; label?: string }) {
  const [link, setLink] = useState<Link | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  const refresh = useCallback(() => {
    call<Link>("/api/telegram/link", "POST")
      .then((l) => { setLink(l); setError(null); })
      .catch((e) => setError((e as Error).message));
  }, []);

  // Links expire after 15 minutes; keep a fresh one ready.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  // While waiting, check every 2 seconds whether the user pressed Start.
  useEffect(() => {
    if (!waiting || !link) return;
    const since = new Date(link.issuedAt).getTime() - 5000;
    const id = setInterval(async () => {
      try {
        const s = await call<{ connected: boolean; connectedAt: string | null; label: string | null }>("/api/telegram/status");
        if (!done.current && s.connected && s.connectedAt && new Date(s.connectedAt).getTime() >= since) {
          done.current = true;
          clearInterval(id);
          onConnected(s.label ?? "Telegram");
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(id);
  }, [waiting, link, onConnected]);

  if (link?.mode === "console") {
    return (
      <div className="space-y-3">
        <button
          className="btn-primary btn-lg w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await call("/api/telegram/dev-connect", "POST");
              setWaiting(true);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <TelegramIcon /> {busy ? "Connecting…" : "Connect (local mode)"}
        </button>
        <p className="text-[13px] leading-relaxed text-fg-subtle">No bot token is set here, so messages are shown in the app instead of sent. Add TELEGRAM_BOT_TOKEN to deliver them for real.</p>
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href={link?.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!link}
        className={`btn-primary btn-lg w-full ${link ? "" : "pointer-events-none opacity-60"}`}
        onClick={() => setWaiting(true)}
      >
        <TelegramIcon /> {label}
      </a>
      {waiting ? (
        <div className="flex items-center gap-2.5 text-[13.5px] text-fg-muted" aria-live="polite">
          <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-border-strong border-t-fg" aria-hidden="true" />
          <span>
            Waiting for you to press <span className="font-medium text-fg">Start</span> in Telegram…
          </span>
        </div>
      ) : (
        <p className="text-[13.5px] leading-relaxed text-fg-muted">
          Telegram opens a chat with the HeadsApp bot. Press <span className="font-medium text-fg">Start</span>, then come back here. This page continues by itself.
        </p>
      )}
      {error && (
        <p className="text-[13px] text-danger">
          {error}{" "}
          <button className="underline" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      <p className="text-[12.5px] text-fg-subtle">
        No Telegram yet?{" "}
        <a href="https://telegram.org/apps" target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-2 hover:text-fg">
          Get the free app
        </a>{" "}
        and come back.
      </p>
    </div>
  );
}
