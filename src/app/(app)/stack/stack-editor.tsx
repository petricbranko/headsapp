"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StackPicker } from "@/components/stack-picker";
import { call } from "@/components/api";

export function StackEditor({ initial, max }: { initial: string[]; max: number }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function change(next: string[]) {
    setKeys(next);
    setError(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await call("/api/stack", "PUT", { keys: next });
        setSaved(next);
        setStatus("saved");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        setKeys(saved);
        setStatus("error");
      }
    }, 500);
  }

  return (
    <div>
      <div className="mb-5 flex h-5 items-center justify-between text-[13px]">
        <span className="text-fg-muted">
          {keys.length} watched{max < 500 ? ` of ${max}` : ""}
        </span>
        <span className={status === "error" ? "text-danger" : "text-fg-subtle"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? error : ""}
        </span>
      </div>
      <StackPicker value={keys} onChange={change} />
    </div>
  );
}
