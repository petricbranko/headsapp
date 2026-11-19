"use client";

import { useMemo, useState } from "react";
import { CATALOG, CATEGORIES, isValidNpmName, labelForKey, searchCatalog, vendorKey, npmKey } from "@/lib/catalog";

function Chip({ selected, onClick, children, title }: { selected: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] transition-[background-color,color,box-shadow] duration-150 ${
        selected
          ? "bg-fg text-bg shadow-[inset_0_0_0_1px_var(--fg)]"
          : "bg-bg-raised text-fg shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_var(--fg-subtle)]"
      }`}
    >
      {children}
      {selected && (
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className="-mr-0.5 opacity-80">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function StackPicker({ value, onChange, autoFocus }: { value: string[]; onChange: (keys: string[]) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (key: string) => onChange(selected.has(key) ? value.filter((k) => k !== key) : [...value, key]);

  const query = q.trim().toLowerCase();
  const results = query ? searchCatalog(query, 14) : [];
  const npmCandidate = query && isValidNpmName(query) && !results.some((r) => r.name.toLowerCase() === query) ? query : null;
  const packages = value.filter((k) => k.startsWith("npm:"));
  const popular = CATALOG.filter((e) => e.popular);

  return (
    <div className="space-y-5">
      <div className="relative">
        <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className="input pl-11"
          placeholder="Search tools or type any npm package"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (results[0] && results[0].name.toLowerCase().startsWith(query)) toggle(vendorKey(results[0].slug));
            else if (npmCandidate) toggle(npmKey(npmCandidate));
            setQ("");
          }}
          aria-label="Search tools"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>

      {query ? (
        <div className="flex flex-wrap gap-2 animate-in">
          {results.map((e) => (
            <Chip key={e.slug} selected={selected.has(vendorKey(e.slug))} onClick={() => toggle(vendorKey(e.slug))}>
              {e.name}
            </Chip>
          ))}
          {npmCandidate && (
            <Chip selected={selected.has(npmKey(npmCandidate))} onClick={() => toggle(npmKey(npmCandidate))} title="Watch this npm package for advisories and malware">
              <span className="font-mono text-[13px]">{npmCandidate}</span>
              <span className="text-[12px] opacity-60">npm</span>
            </Chip>
          )}
          {!results.length && !npmCandidate && <p className="text-sm text-fg-subtle">No matches. Try a product name or an npm package name.</p>}
        </div>
      ) : showAll ? (
        <div className="space-y-5 animate-in">
          {CATEGORIES.map((c) => (
            <div key={c}>
              <div className="mb-2.5 text-[13px] text-fg-subtle">{c}</div>
              <div className="flex flex-wrap gap-2">
                {CATALOG.filter((e) => e.category === c).map((e) => (
                  <Chip key={e.slug} selected={selected.has(vendorKey(e.slug))} onClick={() => toggle(vendorKey(e.slug))}>
                    {e.name}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="text-sm text-fg-muted hover:text-fg" onClick={() => setShowAll(false)}>
            Show fewer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {popular.map((e) => (
              <Chip key={e.slug} selected={selected.has(vendorKey(e.slug))} onClick={() => toggle(vendorKey(e.slug))}>
                {e.name}
              </Chip>
            ))}
          </div>
          <button type="button" className="text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-fg" onClick={() => setShowAll(true)}>
            Browse all {CATALOG.length} tools
          </button>
        </div>
      )}

      {packages.length > 0 && (
        <div>
          <div className="mb-2.5 text-[13px] text-fg-subtle">npm packages</div>
          <div className="flex flex-wrap gap-2">
            {packages.map((k) => (
              <Chip key={k} selected onClick={() => toggle(k)} title="Click to remove">
                <span className="font-mono text-[13px]">{labelForKey(k)}</span>
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
