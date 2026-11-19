"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { StackBuilder, SelectedStack } from "@/components/stack-builder";
import { PhoneVerify } from "@/components/phone-verify";
import { WhatsAppBubble } from "@/components/whatsapp-mock";
import { ToolLogo } from "@/components/tool-logo";
import { labelForKey } from "@/lib/catalog";
import { call } from "@/components/api";
import { clock } from "@/lib/time";

type Step = 0 | 1 | 2;
interface SentMessage {
  body: string;
  provider: "twilio" | "console";
  createdAt: string;
}

const STEPS = ["Your stack", "WhatsApp", "Done"];

function Progress({ step }: { step: Step }) {
  return (
    <ol className="hidden items-center gap-2 text-[13px] md:flex">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${
              i < step ? "bg-accent text-white" : i === step ? "bg-fg text-white" : "bg-bg-muted text-fg-subtle"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </span>
          <span className={i === step ? "font-medium text-fg" : "text-fg-subtle"}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border-strong" />}
        </li>
      ))}
    </ol>
  );
}

export function Onboarding({ initialStack, hasPhone, phone, consoleMode, max, limitHint }: { initialStack: string[]; hasPhone: boolean; phone?: string; consoleMode: boolean; max: number; limitHint?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [keys, setKeys] = useState<string[]>(initialStack);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentMessage | null>(null);
  const [to, setTo] = useState(phone);
  const overLimit = keys.length > max;

  async function saveStack() {
    setBusy(true);
    setError(null);
    try {
      await call("/api/stack", "PUT", { keys });
      if (hasPhone) {
        const r = await call<{ message: SentMessage }>("/api/alerts/test", "POST");
        setSent(r.message);
        setStep(2);
      } else setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    await call("/api/onboarding", "POST").catch(() => {});
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 lg:px-10">
        <Logo href="/dashboard" />
        <Progress step={step} />
        <button className="text-[13px] text-fg-muted hover:text-fg" onClick={finish}>
          Skip setup
        </button>
      </header>

      {step === 0 && (
        <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 px-6 py-10 lg:px-12 lg:py-14">
            <div className="animate-in">
              <div className="kicker">Step 1 of 3</div>
              <h1 className="heading mt-2 text-[32px] sm:text-[36px]">What&apos;s in your stack?</h1>
              <p className="mt-3 max-w-[640px] text-[15px] leading-relaxed text-fg-muted">
                Add the services and packages you depend on. Pick from the list, paste or import your own, or let your coding agent write the list for you.
              </p>
              <div className="mt-8">
                <StackBuilder value={keys} onChange={setKeys} />
              </div>
            </div>
          </main>
          <aside className="flex flex-col border-t border-border bg-bg-subtle lg:sticky lg:top-0 lg:h-[calc(100dvh-64px)] lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between px-6 pb-3 pt-6">
              <div className="text-[14px] font-semibold">Your stack</div>
              <div className="text-[13px] tabular-nums text-fg-subtle">
                {keys.length}
                {max < 500 ? ` / ${max}` : ""}
              </div>
            </div>
            <div className="min-h-[120px] flex-1 overflow-y-auto px-4">
              <SelectedStack value={keys} max={max} onRemove={(k) => setKeys(keys.filter((x) => x !== k))} empty="Nothing yet. Pick a few tools to start." />
            </div>
            <div className="space-y-3 border-t border-border bg-bg-subtle p-6">
              {overLimit && <p className="text-[13px] leading-relaxed text-fg-muted">{limitHint ?? `You can monitor up to ${max} tools.`}</p>}
              {error && <p className="text-[13px] text-danger">{error}</p>}
              <button className="btn-primary btn-lg w-full" disabled={!keys.length || busy || overLimit} onClick={saveStack}>
                {busy ? "Saving…" : keys.length ? `Continue with ${keys.length} ${keys.length === 1 ? "tool" : "tools"}` : "Select at least one tool"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {step === 1 && (
        <main className="flex flex-1 items-start justify-center px-6 py-16 sm:py-24">
          <div className="w-full max-w-[460px] animate-in">
            <div className="kicker">Step 2 of 3</div>
            <h1 className="heading mt-2 text-[32px]">Where should we send alerts?</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">Your WhatsApp number. We&apos;ll verify it and send a test alert right away.</p>
            <div className="mt-8">
              <PhoneVerify
                onVerified={async (e164) => {
                  setTo(e164);
                  const r = await call<{ messages: SentMessage[] }>("/api/messages?limit=1");
                  setSent(r.messages[0] ?? null);
                  setStep(2);
                }}
              />
            </div>
            <button className="mt-8 text-[13px] text-fg-muted hover:text-fg" onClick={() => setStep(0)}>
              ← Back to stack
            </button>
          </div>
        </main>
      )}

      {step === 2 && (
        <main className="flex flex-1 items-start justify-center px-6 py-16 sm:py-20">
          <div className="w-full max-w-[520px] animate-in">
            <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
              <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h1 className="heading mt-6 text-[32px]">You&apos;re all set</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
              {consoleMode ? "We sent your test alert. Twilio isn't configured here, so it was logged instead. This is exactly what you'll get:" : `We sent a test alert to ${to}. Real alerts look exactly like this:`}
            </p>
            {sent && (
              <div className="mt-6">
                <WhatsAppBubble body={sent.body} time={clock(sent.createdAt)} />
              </div>
            )}
            <div className="mt-6 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {keys.slice(0, 6).map((k) => (
                  <ToolLogo key={k} stackKey={k} name={labelForKey(k)} size={26} />
                ))}
              </div>
              <span className="text-[13px] text-fg-muted">Monitoring {keys.length} {keys.length === 1 ? "tool" : "tools"} around the clock</span>
            </div>
            <button className="btn-primary btn-lg mt-10 w-full" onClick={finish} disabled={busy}>
              Go to dashboard
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
