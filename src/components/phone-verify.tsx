"use client";

import { useEffect, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { call } from "./api";
import { PhoneInput, guessCountry } from "./phone-input";

function CodeBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => refs.current[Math.min(value.length, 5)]?.focus(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex gap-2" onPaste={(e) => {
      const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (digits) { e.preventDefault(); onChange(digits); refs.current[Math.min(digits.length, 5)]?.focus(); }
    }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="h-14 w-12 rounded-xl border border-border-strong bg-bg text-center text-[22px] font-medium tabular-nums shadow-[var(--shadow-xs)] outline-none transition focus:border-fg focus:ring-[3px] focus:ring-black/[0.06] disabled:opacity-60 sm:w-14"
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, 6);
            onChange(next);
            if (d && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function PhoneVerify({ onVerified, submitLabel = "Send code", autoFocus = true }: { onVerified: (e164: string) => void; submitLabel?: string; autoFocus?: boolean }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [country, setCountry] = useState<CountryCode>("US");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCountry(guessCountry()), []);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ e164: string; devCode?: string }>("/api/phone/start", "POST", { phone, country });
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

  async function verify(value: string) {
    if (value.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ e164: string }>("/api/phone/verify", "POST", { code: value });
      onVerified(r.e164);
    } catch (err) {
      setError((err as Error).message);
      setCode("");
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <div className="space-y-4">
        <PhoneInput country={country} onCountry={setCountry} value={phone} onChange={setPhone} autoFocus={autoFocus} onEnter={start} />
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <button className="btn-primary btn-lg w-full" disabled={busy || phone.replace(/\D/g, "").length < 5} onClick={start}>
          {busy ? "Sending code…" : submitLabel}
        </button>
        <p className="text-center text-[13px] text-fg-subtle">We&apos;ll send a 6-digit code on WhatsApp. Your number is only used for alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      <p className="text-[14px] text-fg-muted">
        Enter the code we sent to <span className="font-medium text-fg">{e164}</span>.{" "}
        <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => { setStep("phone"); setError(null); }}>
          Change number
        </button>
      </p>
      <CodeBoxes value={code} disabled={busy} onChange={(v) => { setCode(v); if (v.length === 6) verify(v); }} />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {devCode && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-bg-muted px-4 py-3 text-[13px] text-fg-muted">
          <span>
            Local mode (no Twilio). Your code is <span className="font-semibold tabular-nums text-fg">{devCode}</span>
          </span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => { setCode(devCode); verify(devCode); }}>
            Use code
          </button>
        </div>
      )}
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-fg-subtle">{busy ? "Checking…" : "Didn't get it?"}</span>
        <button type="button" className="font-medium text-fg-muted hover:text-fg" onClick={start} disabled={busy}>
          Resend code
        </button>
      </div>
    </div>
  );
}
