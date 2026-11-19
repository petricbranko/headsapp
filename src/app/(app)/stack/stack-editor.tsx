"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StackBuilder, SelectedStack } from "@/components/stack-builder";
import { call } from "@/components/api";

export function StackEditor({ initial, max, limitHint }: { initial: string[]; max: number; limitHint?: string }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initial);
  const saved = useRef(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function change(next: string[]) {
    if (next.length > max) {
      setError(limitHint ?? `You can monitor up to ${max} tools.`);
      setStatus("error");
      return;
    }
    setKeys(next);
    setError(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await call("/api/stack", "PUT", { keys: next });
        saved.current = next;
        setStatus("saved");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        setKeys(saved.current);
        setStatus("error");
      }
    }, 400);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
      <div className="min-w-0">
        <StackBuilder value={keys} onChange={change} />
      </div>
      <aside className="h-fit xl:sticky xl:top-8">
        <div className="xl:border-l xl:border-border xl:pl-8">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="text-[14px] font-semibold">
              Your stack <span className="font-normal text-fg-subtle">· {keys.length}{max < 500 ? ` of ${max}` : ""}</span>
            </div>
            <span className={`text-[12px] ${status === "error" ? "text-danger" : "text-fg-subtle"}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
          </div>
          <div className="-mx-2 max-h-[60vh] overflow-y-auto py-2">
            <SelectedStack value={keys} onRemove={(k) => change(keys.filter((x) => x !== k))} empty="Pick tools on the left to start monitoring." />
          </div>
          {error && <div className="pt-3 text-[13px] text-danger">{error}</div>}
        </div>
      </aside>
    </div>
  );
}
