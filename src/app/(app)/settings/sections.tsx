"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneVerify } from "@/components/phone-verify";
import { call } from "@/components/api";

export function PhoneSection({ phone }: { phone?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!phone);
  const [note, setNote] = useState<string | null>(null);

  if (editing)
    return (
      <PhoneVerify
        autoFocus={Boolean(phone)}
        onVerified={() => {
          setEditing(false);
          setNote("Verified. We sent you a test alert.");
          router.refresh();
        }}
      />
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div>
          <div className="font-mono text-[15px]">{phone}</div>
          <div className="text-[12px] text-accent">Verified</div>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>
      {note && <p className="text-[13px] text-fg-muted">{note}</p>}
    </div>
  );
}

const LEVELS = [
  { v: "critical", label: "Critical only" },
  { v: "high", label: "High and up" },
  { v: "medium", label: "Medium and up" },
] as const;

export function AlertPrefs({ enabled, minSeverity, hasPhone }: { enabled: boolean; minSeverity: string; hasPhone: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [level, setLevel] = useState(minSeverity);
  const [test, setTest] = useState<string | null>(null);

  async function save(patch: Record<string, unknown>) {
    await call("/api/prefs", "PATCH", patch);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-[14px]">Send WhatsApp alerts</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => {
            setOn(!on);
            save({ alertsEnabled: !on });
          }}
          className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-accent" : "bg-border-strong"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </label>
      <div className="inline-flex rounded-full border border-border p-0.5" role="radiogroup" aria-label="Minimum severity">
        {LEVELS.map((l) => (
          <button
            key={l.v}
            role="radio"
            aria-checked={level === l.v}
            onClick={() => {
              setLevel(l.v);
              save({ minSeverity: l.v });
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${level === l.v ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="btn-ghost btn-sm"
          disabled={!hasPhone}
          onClick={async () => {
            setTest("Sending…");
            try {
              const r = await call<{ message: { provider: string } }>("/api/alerts/test", "POST");
              setTest(r.message.provider === "console" ? "Logged to the server console (Twilio not configured)." : "Sent. Check WhatsApp.");
              router.refresh();
            } catch (e) {
              setTest((e as Error).message);
            }
          }}
        >
          Send test alert
        </button>
        {test && <span className="text-[13px] text-fg-muted">{test}</span>}
      </div>
    </div>
  );
}

export function DangerZone() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={`btn-sm btn ${armed ? "bg-danger text-white" : "text-danger hover:bg-bg-muted"}`}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        await call("/api/account", "DELETE");
        window.location.href = "/logout";
      }}
    >
      {armed ? "Click again to delete everything" : "Delete account"}
    </button>
  );
}
