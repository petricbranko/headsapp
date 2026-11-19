"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/components/api";

export function CheckNow() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");
  return (
    <button
      className="btn-primary btn-sm"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        try {
          const r = await call<{ newIncidents: number; skipped?: string }>("/api/ingest", "POST");
          setState(r.skipped ? "Already running" : r.newIncidents ? `${r.newIncidents} new` : "Up to date");
          router.refresh();
        } catch (e) {
          setState((e as Error).message.includes("minute") ? "Checked recently" : "Failed");
        }
        setTimeout(() => setState("idle"), 3000);
      }}
    >
      {state === "busy" ? "Checking…" : state === "idle" ? "Check now" : state}
    </button>
  );
}
