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
import type { Paywall } from "@/edition";

type Step = 0 | "pay" | 1 | 2;
interface SentMessage {
  body: string;
  provider: "twilio" | "console";
  createdAt: string;
}

function Progress({ step, paid }: { step: Step; paid: boolean }) {
  const order: Step[] = paid ? [0, "pay", 1, 2] : [0, 1, 2];
  const labels: Record<string, string> = { "0": "Your stack", pay: "Subscribe", "1": "WhatsApp", "2": "Done" };
  const STEPS = order.map((o) => labels[String(o)]);
  const idx = order.indexOf(step);
  return (
    <ol className="hidden items-center gap-2 text-[13px] md:flex">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${
              i < idx ? "bg-accent text-white" : i === idx ? "bg-fg text-white" : "bg-bg-muted text-fg-subtle"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </span>
          <span className={i === idx ? "font-medium text-fg" : "text-fg-subtle"}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border-strong" />}
        </li>
      ))}
    </ol>
  );
}

export function Onboarding({
  initialStep = 0,
  paywall,
  initialStack,
  hasPhone,
  phone,
  consoleMode,
  max,
  limitHint,
}: {
  initialStep?: Step;
  paywall: Paywall | null;
  initialStack: string[];
  hasPhone: boolean;
  phone?: string;
  consoleMode: boolean;
  max: number;
  limitHint?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const total = paywall ? 4 : 3;
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
      if (paywall) setStep("pay");
      else if (hasPhone) {
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
        <Progress step={step} paid={Boolean(paywall)} />
        {paywall ? (
          <a href="/logout" className="text-[13px] text-fg-muted hover:text-fg">
            Log out
          </a>
        ) : (
          <button className="text-[13px] text-fg-muted hover:text-fg" onClick={finish}>
            Skip setup
          </button>
        )}
      </header>

      {step === 0 && (
        <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 px-6 py-10 lg:px-12 lg:py-14">
            <div className="animate-in">
              <div className="kicker">Step 1 of {total}</div>
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

      {step === "pay" && paywall && <PayStep paywall={paywall} count={keys.length} onBack={() => setStep(0)} />}

      {step === 1 && (
        <main className="flex flex-1 items-start justify-center px-6 py-16 sm:py-24">
          <div className="w-full max-w-[460px] animate-in">
            <div className="kicker">Step {total - 1} of {total}</div>
            <h1 className="heading mt-2 text-[32px]">Where should we send alerts?</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">Your WhatsApp number. We&apos;ll verify it and send a test alert right away.</p>
            <div className="mt-8">
              <PhoneVerify
                onVerified={async (e164) => {
                  setTo(e164);
                  const r = await call<{ messages: SentMessage[] }>("/api/messages?limit=1");
                  // (no test message is sent if alerts aren't enabled for this account)
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

function PayStep({ paywall, count, onBack }: { paywall: Paywall; count: number; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="flex flex-1 items-start justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-[480px] animate-in">
        <div className="kicker">Step 2 of 4</div>
        <h1 className="heading mt-2 text-[32px]">{paywall.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{paywall.description}</p>
        <div className="card mt-8 p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-semibold">HeadsApp Pro</span>
            <span>
              <span className="heading text-[28px]">{paywall.price}</span> <span className="text-[13px] text-fg-muted">{paywall.per}</span>
            </span>
          </div>
          <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-[14px]">
            {[`Monitoring the ${count} ${count === 1 ? "tool" : "tools"} you picked`, ...paywall.features].map((f) => (
              <li key={f} className="flex gap-2.5">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
          <button
            className="btn-primary btn-lg mt-6 w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { url } = await call<{ url: string }>(paywall.endpoint, "POST");
                window.location.href = url;
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? "Opening checkout…" : paywall.cta}
          </button>
        </div>
        <button className="mt-8 text-[13px] text-fg-muted hover:text-fg" onClick={onBack}>
          ← Back to stack
        </button>
      </div>
    </main>
  );
}
