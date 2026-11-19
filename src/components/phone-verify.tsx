"use client";

import { useEffect, useRef, useState } from "react";
import { call } from "./api";

function guessCountry(): string | undefined {
  try {
    const loc = new Intl.Locale(navigator.language);
    return loc.region ?? undefined;
  } catch {
    return undefined;
  }
}

export function PhoneVerify({ onVerified, initialPhone, submitLabel = "Send code", autoFocus = true }: { onVerified: (e164: string) => void; initialPhone?: string; submitLabel?: string; autoFocus?: boolean }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [e164, setE164] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ e164: string; devCode?: string }>("/api/phone/start", "POST", { phone, country: guessCountry() });
      setE164(r.e164);
      setDevCode(r.devCode);
      setCode("");
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (value.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ e164: string }>("/api/phone/verify", "POST", { code: value });
      onVerified(r.e164);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={start} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1 text-base tracking-wide"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 415 555 0100"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="WhatsApp number"
            autoFocus={autoFocus}
            required
          />
          <button className="btn-primary h-11 px-6" disabled={busy || phone.replace(/\D/g, "").length < 6}>
            {busy ? "Sending…" : submitLabel}
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <p className="text-[13px] text-fg-subtle">We&apos;ll send a 6-digit code on WhatsApp. Your number is only used for alerts.</p>
      </form>
    );
  }

  return (
    <div className="space-y-3 animate-in">
      <p className="text-[14px] text-fg-muted">
        Code sent to <span className="font-medium text-fg">{e164}</span> on WhatsApp.{" "}
        <button type="button" className="text-fg underline underline-offset-4" onClick={() => { setStep("phone"); setError(null); }}>
          Change
        </button>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={codeRef}
          className="input flex-1 text-center font-mono text-xl tracking-[0.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (v.length === 6) verify(v);
          }}
          aria-label="Verification code"
        />
        <button className="btn-primary h-11 px-6" disabled={busy || code.length < 6} onClick={() => verify()}>
          {busy ? "Checking…" : "Verify"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {devCode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border-strong bg-bg-subtle px-4 py-2.5 text-[13px] text-fg-muted">
          <span>
            Local mode, no Twilio: your code is <span className="font-mono font-semibold text-fg">{devCode}</span>
          </span>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setCode(devCode); verify(devCode); }}>
            Use it
          </button>
        </div>
      )}
      <button type="button" className="text-[13px] text-fg-subtle hover:text-fg" onClick={() => start()} disabled={busy}>
        Didn&apos;t get it? Send again
      </button>
    </div>
  );
}
