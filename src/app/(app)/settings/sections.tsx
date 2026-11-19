"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneVerify } from "@/components/phone-verify";
import { call } from "@/components/api";

export function PhoneSection({ phone, display }: { phone?: string; display?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!phone);
  const [note, setNote] = useState<string | null>(null);

  if (editing)
    return (
      <div className="space-y-3">
        <PhoneVerify
          autoFocus={Boolean(phone)}
          onVerified={() => {
            setEditing(false);
            setNote("Verified. We sent you a test alert.");
            router.refresh();
          }}
        />
        {phone && (
          <button className="text-[13px] text-fg-muted hover:text-fg" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div>
          <div className="text-[15px] font-medium tabular-nums">{display ?? phone}</div>
          <div className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-accent-text">
            <span className="size-1.5 rounded-full bg-accent" />
            Verified
          </div>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>
      {note && <p className="text-[13px] text-fg-muted">{note}</p>}
    </div>
  );
}

const LEVELS = [
  { v: "critical", label: "Critical only" },
  { v: "high", label: "High and critical" },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[14px] font-medium">WhatsApp alerts</div>
          <div className="text-[13px] text-fg-muted">Pause messages without losing your setup.</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="WhatsApp alerts"
          onClick={() => {
            setOn(!on);
            save({ alertsEnabled: !on });
          }}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-border-strong"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      <div>
        <div className="mb-2 text-[14px] font-medium">Send me</div>
        <div className="inline-flex rounded-lg bg-bg-muted p-1" role="radiogroup" aria-label="Minimum severity">
          {LEVELS.map((l) => (
            <button
              key={l.v}
              role="radio"
              aria-checked={level === l.v}
              onClick={() => {
                setLevel(l.v);
                save({ minSeverity: l.v });
              }}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${level === l.v ? "bg-bg text-fg shadow-[var(--shadow-sm)]" : "text-fg-muted hover:text-fg"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          className="btn-secondary"
          disabled={!hasPhone}
          onClick={async () => {
            setTest("Sending…");
            try {
              const r = await call<{ message: { provider: string } }>("/api/alerts/test", "POST");
              setTest(r.message.provider === "console" ? "Logged locally (Twilio not configured)." : "Sent. Check WhatsApp.");
              router.refresh();
            } catch (e) {
              setTest((e as Error).message);
            }
          }}
        >
          Send a test alert
        </button>
        {test && <span className="text-[13px] text-fg-muted">{test}</span>}
      </div>
    </div>
  );
}

export function DangerZone() {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={`btn ${armed ? "bg-danger text-white" : "text-danger hover:bg-[#fdecec]"}`}
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
