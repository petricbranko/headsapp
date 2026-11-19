"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "./api";

type State = "fixed" | "not_affected" | "open";

/** "Mark as fixed" / "Not affected": lets the user close the loop on an incident. */
export function IncidentActions({ id, state, size = "sm" }: { id: string; state?: State; size?: "sm" | "md" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<State | null>(null);
  const [current, setCurrent] = useState<State>(state ?? "open");
  const [error, setError] = useState<string | null>(null);

  async function set(next: State) {
    setBusy(next);
    setError(null);
    try {
      await call(`/api/incidents/${id}/state`, "POST", { state: next });
      setCurrent(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const cls = size === "sm" ? "btn-sm" : "";
  if (current !== "open")
    return (
      <span className="inline-flex items-center gap-2 text-[13px]" aria-live="polite">
        <span className="inline-flex items-center gap-1.5 font-medium text-accent-text">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {current === "fixed" ? "Marked as fixed" : "Marked not affected"}
        </span>
        <button className="text-fg-subtle underline-offset-4 hover:text-fg hover:underline" onClick={() => set("open")} disabled={busy !== null}>
          Undo
        </button>
      </span>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2" aria-live="polite">
      <button className={`btn-secondary ${cls}`} onClick={() => set("fixed")} disabled={busy !== null}>
        {busy === "fixed" ? "Saving…" : "Mark as fixed"}
      </button>
      <button className={`btn-ghost ${cls}`} onClick={() => set("not_affected")} disabled={busy !== null}>
        {busy === "not_affected" ? "Saving…" : "Not affected"}
      </button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </span>
  );
}
