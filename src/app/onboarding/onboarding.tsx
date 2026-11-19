"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { StackPicker } from "@/components/stack-picker";
import { PhoneVerify } from "@/components/phone-verify";
import { WhatsAppMock } from "@/components/whatsapp-mock";
import { call } from "@/components/api";
import { clock } from "@/lib/time";

type Step = 0 | 1 | 2;
interface SentMessage {
  body: string;
  provider: "twilio" | "console";
  status: string;
  createdAt: string;
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
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <Logo href="/dashboard" />
        <span className="text-[13px] tabular-nums text-fg-subtle" aria-label={`Step ${step + 1} of 3`}>
          {step + 1} <span className="opacity-60">/</span> 3
        </span>
      </header>

      <div className="mt-14 flex-1 sm:mt-24">
        {step === 0 && (
          <section key="s0" className="animate-in">
            <h1 className="display text-[42px] sm:text-[48px]">What&apos;s in your stack?</h1>
            <p className="mt-4 text-[16px] leading-relaxed text-fg-muted">Pick the tools you depend on. We&apos;ll only message you when one of them has a security incident.</p>
            <div className="mt-10">
              <StackPicker value={keys} onChange={setKeys} />
            </div>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            {overLimit && (
              <p className="mt-4 text-sm text-fg-muted">
                {limitHint ?? `You can watch up to ${max} tools.`} Remove {keys.length - max} to continue.
              </p>
            )}
            <div className="sticky bottom-0 -mx-6 mt-10 bg-gradient-to-t from-bg via-bg to-transparent px-6 pb-4 pt-6">
              <button className="btn-primary h-12 w-full text-[15px]" disabled={!keys.length || busy || overLimit} onClick={saveStack}>
                {busy ? "Saving…" : overLimit ? `${keys.length} of ${max} selected` : keys.length ? `Watch ${keys.length} tool${keys.length === 1 ? "" : "s"}` : "Pick at least one tool"}
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section key="s1" className="animate-in">
            <h1 className="display text-[42px] sm:text-[48px]">Where should we message you?</h1>
            <p className="mt-4 text-[16px] leading-relaxed text-fg-muted">Your WhatsApp number. Alerts go here, along with a test message right now.</p>
            <div className="mt-8">
              <PhoneVerify
                onVerified={async (e164) => {
                  setTo(e164);
                  // The verify endpoint sends the test alert; fetch it for the preview.
                  const r = await call<{ messages: SentMessage[] }>("/api/messages?limit=1");
                  setSent(r.messages[0] ?? null);
                  setStep(2);
                }}
              />
            </div>
            <div className="mt-10 flex items-center justify-between text-[13px]">
              <button className="text-fg-subtle hover:text-fg" onClick={() => setStep(0)}>
                ← Back
              </button>
              <button className="text-fg-subtle hover:text-fg" onClick={finish}>
                Skip for now
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section key="s2" className="animate-in">
            <div className="inline-flex items-center gap-2 text-[14px] text-fg">
              <span className="size-[7px] rounded-full bg-accent pulse-dot" /> Watching {keys.length} tool{keys.length === 1 ? "" : "s"}
            </div>
            <h1 className="display mt-4 text-[42px] sm:text-[48px]">You&apos;re set. <span className="italic text-fg-muted">Check WhatsApp.</span></h1>
            <p className="mt-4 text-[16px] leading-relaxed text-fg-muted">
              {consoleMode ? (
                <>We just sent your test alert. Twilio isn&apos;t configured here, so it was printed to the server console instead. This is what it looks like:</>
              ) : (
                <>We just sent a test alert to {to}. Real alerts look exactly like this.</>
              )}
            </p>
            {sent && <WhatsAppMock className="mt-8" messages={[{ body: sent.body, time: clock(sent.createdAt) }]} />}
            <button className="btn-primary mt-10 h-12 w-full text-[15px]" onClick={finish} disabled={busy}>
              Go to dashboard
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
