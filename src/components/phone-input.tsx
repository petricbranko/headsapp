"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AsYouType, getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

interface Country {
  code: CountryCode;
  name: string;
  dial: string;
}

let cache: Country[] | null = null;
function countries(): Country[] {
  if (cache) return cache;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  cache = getCountries()
    .map((code) => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export function guessCountry(): CountryCode {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region as CountryCode | undefined;
    if (region && getCountries().includes(region)) return region;
  } catch {}
  return "US";
}

function Flag({ code, className = "" }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${code}.svg`} alt="" loading="lazy" width={20} height={14} className={`h-[14px] w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)] ${className}`} />;
}

/** Country picker (flag + dial code) and a national number field that formats as you type. */
export function PhoneInput({
  country,
  onCountry,
  value,
  onChange,
  autoFocus,
  onEnter,
}: {
  country: CountryCode;
  onCountry: (c: CountryCode) => void;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^\+/, "");
    const all = countries();
    if (!s) return all;
    return all.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s || c.dial.startsWith(s));
  }, [q]);
  const current = countries().find((c) => c.code === country) ?? countries()[0];

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => setActive(0), [q]);

  function pick(c: Country) {
    onCountry(c.code);
    setOpen(false);
    setQ("");
    requestAnimationFrame(() => numberRef.current?.focus());
  }

  return (
    <div ref={wrap} className="relative">
      <div className="flex h-12 w-full items-stretch rounded-xl border border-border-strong bg-bg shadow-[var(--shadow-xs)] transition focus-within:border-accent focus-within:ring-[3px] focus-within:ring-[var(--accent-ring)]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-l-xl border-r border-border pl-3.5 pr-3 text-[15px] text-fg hover:bg-bg-hover"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country: ${current.name}`}
        >
          <Flag code={current.code} />
          <span className="tabular-nums text-fg-muted">+{current.dial}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="text-fg-subtle">
            <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input
          ref={numberRef}
          className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3.5 text-[16px] tracking-[0.01em] text-fg outline-none placeholder:text-fg-subtle"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Phone number"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            const raw = e.target.value;
            // Pasting a full international number switches the country automatically.
            if (raw.trim().startsWith("+")) {
              const t = new AsYouType();
              const formatted = t.input(raw);
              const c = t.getCountry();
              if (c) {
                onCountry(c);
                onChange(new AsYouType(c).input(t.getNationalNumber()));
                return;
              }
              onChange(formatted);
              return;
            }
            onChange(new AsYouType(country).input(raw));
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onEnter?.())}
          aria-label="WhatsApp number"
        />
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[320px] overflow-hidden rounded-xl border border-border bg-bg shadow-[var(--shadow-lg)] animate-in">
          <div className="border-b border-border p-2">
            <input
              ref={search}
              className="h-9 w-full rounded-lg bg-bg-muted px-3 text-[14px] outline-none placeholder:text-fg-subtle"
              placeholder="Search country or code"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, list.length - 1)));
                if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
                if (e.key === "Enter" && list[active]) (e.preventDefault(), pick(list[active]));
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </div>
          <ul role="listbox" className="max-h-[280px] overflow-y-auto p-1">
            {list.map((c, i) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === country}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(c)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[14px] ${i === active ? "bg-bg-muted" : ""}`}
                >
                  <Flag code={c.code} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular-nums text-fg-subtle">+{c.dial}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-6 text-center text-[13px] text-fg-subtle">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
