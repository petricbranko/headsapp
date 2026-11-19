"use client";

import { useMemo, useRef, useState } from "react";
import { CATALOG, CATEGORIES, type Category, isValidNpmName, isValidCustomName, labelForKey, searchCatalog, vendorKey, npmKey, customKey, catalogEntry } from "@/lib/catalog";
import { ToolLogo } from "./tool-logo";
import { call } from "./api";

type Tab = "browse" | "import" | "ai";

interface Resolved {
  input: string;
  key: string;
  name: string;
  kind: "vendor" | "npm" | "custom";
}

const KIND_LABEL: Record<string, string> = { vendor: "Tool", npm: "npm package", custom: "Custom" };

export const AI_PROMPT = `Look through this project (package.json and lockfiles, Dockerfiles, docker-compose, CI config, infrastructure files, .env.example variable names, and imports in the code) and list every third-party service, platform and dependency it relies on: hosting, databases, auth, payments, email/SMS, AI APIs, analytics, monitoring, CI/CD, web servers (like nginx) and the direct npm dependencies.

Reply with ONLY one line: a comma-separated list. Use official product names (e.g. Vercel, Supabase, Stripe) and exact npm package names (e.g. next, @supabase/supabase-js). No explanations, no versions.`;

function kindOf(key: string) {
  return key.split(":")[0];
}

export function nameOf(key: string) {
  return labelForKey(key);
}

/* ----------------------------------------------------------------------------------------------- */

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string }[] = [
    { id: "browse", label: "Browse tools" },
    { id: "import", label: "Paste or import" },
    { id: "ai", label: "Ask your AI agent" },
  ];
  return (
    <div className="inline-flex rounded-lg bg-bg-muted p-1" role="tablist">
      {items.map((i) => (
        <button
          key={i.id}
          role="tab"
          aria-selected={tab === i.id}
          onClick={() => setTab(i.id)}
          className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all ${tab === i.id ? "bg-bg text-fg shadow-[var(--shadow-sm)]" : "text-fg-muted hover:text-fg"}`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Check() {
  return (
    <span className="grid size-[18px] place-items-center rounded-full bg-accent text-white">
      <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6.5 5 9l4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ToolCard({ stackKey, name, sub, selected, onClick }: { stackKey: string; name: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex items-center gap-3 rounded-xl border bg-bg px-3.5 py-3 text-left transition-all ${
        selected ? "border-accent shadow-[0_0_0_3px_var(--accent-ring)]" : "border-border shadow-[var(--shadow-xs)] hover:border-border-strong hover:shadow-[var(--shadow-sm)]"
      }`}
    >
      <ToolLogo stackKey={stackKey} name={name} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-fg">{name}</span>
        <span className="block truncate text-[12px] text-fg-subtle">{sub}</span>
      </span>
      {selected && <Check />}
    </button>
  );
}

/* ----------------------------------------------------------------------------------------------- */

function Browse({ selected, toggle, add }: { selected: Set<string>; toggle: (k: string) => void; add: (keys: string[]) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "Popular" | "All">("Popular");
  const query = q.trim();
  const entries = useMemo(() => {
    if (query) return searchCatalog(query, 40);
    if (cat === "Popular") return CATALOG.filter((e) => e.popular);
    if (cat === "All") return CATALOG;
    return CATALOG.filter((e) => e.category === cat);
  }, [query, cat]);
  const lower = query.toLowerCase();
  const exact = entries.some((e) => e.name.toLowerCase() === lower);
  const npmCandidate = query && !exact && isValidNpmName(lower) ? lower : null;
  const customCandidate = query && !exact && isValidCustomName(query) && (!npmCandidate || /[A-Z\s]/.test(query)) ? query.replace(/\s+/g, " ") : null;

  return (
    <div className="space-y-5">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className="input h-11 pl-10 text-[15px]"
          placeholder={`Search ${CATALOG.length} tools, or type any npm package or service`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (entries[0] && entries[0].name.toLowerCase().startsWith(lower)) toggle(vendorKey(entries[0].slug));
            else if (npmCandidate) add([npmKey(npmCandidate)]);
            else if (customCandidate) add([customKey(customCandidate)]);
            setQ("");
          }}
          aria-label="Search tools"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {!query && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {(["Popular", ...CATEGORIES, "All"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${cat === c ? "bg-fg text-white" : "text-fg-muted hover:bg-bg-muted hover:text-fg"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {entries.map((e) => (
          <ToolCard key={e.slug} stackKey={vendorKey(e.slug)} name={e.name} sub={e.category} selected={selected.has(vendorKey(e.slug))} onClick={() => toggle(vendorKey(e.slug))} />
        ))}
        {npmCandidate && (
          <ToolCard stackKey={npmKey(npmCandidate)} name={npmCandidate} sub="npm package · advisories & malware" selected={selected.has(npmKey(npmCandidate))} onClick={() => toggle(npmKey(npmCandidate))} />
        )}
        {customCandidate && (
          <ToolCard stackKey={customKey(customCandidate)} name={customCandidate} sub="Custom · watched in security news" selected={selected.has(customKey(customCandidate))} onClick={() => toggle(customKey(customCandidate))} />
        )}
      </div>
      {query && !entries.length && !npmCandidate && !customCandidate && <p className="text-[14px] text-fg-subtle">No matches.</p>}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- */

function Preview({ items, skipped, selected, onAdd, onReset }: { items: Resolved[]; skipped: string[]; selected: Set<string>; onAdd: (keys: string[]) => void; onReset: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(items.filter((i) => !selected.has(i.key)).map((i) => i.key)));
  const counts = { vendor: 0, npm: 0, custom: 0 } as Record<string, number>;
  items.forEach((i) => counts[i.kind]++);
  return (
    <div className="animate-in overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-3">
        <div className="text-[13px] text-fg-muted">
          Found <span className="font-medium text-fg">{items.length}</span>: {counts.vendor} tools, {counts.npm} npm packages, {counts.custom} custom
          {skipped.length > 0 && <span className="text-fg-subtle"> · {skipped.length} skipped</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={onReset}>
            Start over
          </button>
          <button className="btn-primary btn-sm" disabled={!picked.size} onClick={() => onAdd([...picked])}>
            Add {picked.size} to stack
          </button>
        </div>
      </div>
      <ul className="max-h-[360px] divide-y divide-border overflow-y-auto">
        {items.map((i) => {
          const already = selected.has(i.key);
          const on = picked.has(i.key) || already;
          return (
            <li key={i.key}>
              <label className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-bg-subtle ${already ? "opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={on}
                  disabled={already}
                  onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(i.key)) n.delete(i.key); else n.add(i.key); return n; })}
                />
                <ToolLogo stackKey={i.key} name={i.name} size={26} />
                <span className="flex-1 truncate text-[14px]">{i.name}</span>
                <span className="text-[12px] text-fg-subtle">{already ? "Already added" : KIND_LABEL[i.kind]}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function useResolver() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ items: Resolved[]; skipped: string[] } | null>(null);
  async function resolve(text: string) {
    setBusy(true);
    setError(null);
    try {
      setResult(await call<{ items: Resolved[]; skipped: string[] }>("/api/stack/resolve", "POST", { text }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, result, resolve, reset: () => setResult(null), fail: setError };
}

function ImportTab({ selected, add, mode }: { selected: Set<string>; add: (keys: string[]) => void; mode: "import" | "ai" }) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const r = useResolver();

  if (r.result) {
    return <Preview items={r.result.items} skipped={r.result.skipped} selected={selected} onReset={() => { r.reset(); setText(""); }} onAdd={(keys) => { add(keys); r.reset(); setText(""); }} />;
  }

  return (
    <div className="space-y-4">
      {mode === "ai" && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-2.5">
            <div className="text-[13px] font-medium">1. Copy this prompt into Claude Code, Cursor, Codex or Copilot</div>
            <button
              className="btn-secondary btn-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(AI_PROMPT).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>
          <pre className="max-h-[150px] overflow-y-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12.5px] leading-relaxed text-fg-muted">{AI_PROMPT}</pre>
        </div>
      )}
      <div>
        {mode === "ai" && <div className="mb-2 text-[13px] font-medium">2. Paste your agent&apos;s answer</div>}
        <textarea
          className="input h-44 resize-none py-3 font-mono text-[13px] leading-relaxed"
          placeholder={mode === "ai" ? "Vercel, Supabase, Stripe, Resend, next, @supabase/supabase-js, …" : "Vercel, Supabase, Stripe\n\n…or paste a package.json, or a CSV with a “name” column"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
      </div>
      {r.error && <p className="text-[13px] text-danger">{r.error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {mode === "import" ? (
          <>
            <input
              ref={file}
              type="file"
              accept=".csv,.txt,.json,text/csv,application/json,text/plain"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 200_000) return r.fail("That file is too large (max 200 KB).");
                const t = await f.text();
                setText(t);
                r.resolve(t);
                e.target.value = "";
              }}
            />
            <button className="btn-secondary" onClick={() => file.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10.5V2.5m0 0L5 5.5m3-3 3 3M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Upload CSV or package.json
            </button>
          </>
        ) : (
          <span className="text-[13px] text-fg-subtle">Nothing leaves your machine except the list you paste.</span>
        )}
        <button className="btn-primary" disabled={!text.trim() || r.busy} onClick={() => r.resolve(text)}>
          {r.busy ? "Matching…" : "Preview"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- */

export function StackBuilder({ value, onChange }: { value: string[]; onChange: (keys: string[]) => void }) {
  const [tab, setTab] = useState<Tab>("browse");
  const selected = useMemo(() => new Set(value), [value]);
  const toggle = (k: string) => onChange(selected.has(k) ? value.filter((x) => x !== k) : [...value, k]);
  const add = (keys: string[]) => onChange([...value, ...keys.filter((k) => !selected.has(k))]);
  return (
    <div className="space-y-6">
      <Tabs tab={tab} setTab={setTab} />
      {tab === "browse" && <Browse selected={selected} toggle={toggle} add={add} />}
      {tab === "import" && <ImportTab key="import" mode="import" selected={selected} add={(k) => { add(k); setTab("browse"); }} />}
      {tab === "ai" && <ImportTab key="ai" mode="ai" selected={selected} add={(k) => { add(k); setTab("browse"); }} />}
    </div>
  );
}

/** The "your stack" list shown next to the builder. */
export function SelectedStack({ value, onRemove, max, empty = "Nothing selected yet." }: { value: string[]; onRemove: (k: string) => void; max?: number; empty?: string }) {
  const groups: [string, string[]][] = [
    ["Tools", value.filter((k) => kindOf(k) === "vendor")],
    ["npm packages", value.filter((k) => kindOf(k) === "npm")],
    ["Custom", value.filter((k) => kindOf(k) === "custom")],
  ];
  if (!value.length) return <p className="py-6 text-center text-[13px] text-fg-subtle">{empty}</p>;
  return (
    <div className="space-y-4">
      {groups.filter(([, ks]) => ks.length).map(([label, ks]) => (
        <div key={label}>
          <div className="mb-1.5 text-[12px] font-medium text-fg-subtle">{label}</div>
          <ul className="space-y-0.5">
            {ks.map((k) => (
              <li key={k} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-bg-hover">
                <ToolLogo stackKey={k} name={nameOf(k)} size={24} />
                <span className="flex-1 truncate text-[13.5px]">{nameOf(k)}</span>
                <span className="text-[12px] text-fg-subtle group-hover:hidden">{kindOf(k) === "vendor" ? catalogEntry(k.slice(7))?.category : ""}</span>
                <button onClick={() => onRemove(k)} className="hidden size-5 place-items-center rounded text-fg-subtle hover:bg-bg-muted hover:text-fg group-hover:grid" aria-label={`Remove ${nameOf(k)}`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="m2 2 6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {max !== undefined && value.length > max && <p className="text-[12.5px] text-danger">Over your plan limit of {max}.</p>}
    </div>
  );
}
