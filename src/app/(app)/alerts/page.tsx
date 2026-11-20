import { requireUser } from "@/lib/auth";
import { cols } from "@/lib/db";
import { messagingMode } from "@/lib/telegram";
import { summarizeMessage } from "@/lib/alert-text";
import { PageHeader } from "@/components/page-header";
import { MessageBubble } from "@/components/message-preview";

export const metadata = { title: "Alerts" };

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "Delivered", cls: "text-accent-text" },
  logged: { label: "Logged locally", cls: "text-fg-muted" },
  failed: { label: "Failed", cls: "text-danger" },
};

export default async function AlertsPage() {
  const user = await requireUser();
  const { messages } = await cols();
  const list = await messages.find({ userId: user._id, kind: { $in: ["alert", "test"] } }).sort({ createdAt: -1 }).limit(100).toArray();
  const consoleMode = messagingMode() === "console";

  return (
    <div>
      <PageHeader
        title="Alerts"
        description={consoleMode ? "Messages sent to your Telegram. No bot is configured here, so they're logged instead of delivered." : "Messages sent to your Telegram."}
      />
      <div className="border-t border-border">
        {list.length === 0 ? (
          <p className="px-5 py-16 text-center text-[14px] text-fg-muted">No alerts yet. When something hits your stack, it shows up here.</p>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {list.map((m) => {
              const s = summarizeMessage(m.body);
              const st = STATUS[m.status] ?? STATUS.logged;
              return (
                <li key={m._id!.toString()}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 py-3.5 [&::-webkit-details-marker]:hidden">
                      <span className="w-[130px] shrink-0 text-[13px] tabular-nums text-fg-muted">
                        {m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{s.title}</span>
                        <span className="block truncate text-[12.5px] text-fg-subtle">{m.kind === "test" ? "Test alert" : s.header}</span>
                      </span>
                      <span className={`hidden text-[13px] sm:block ${st.cls}`}>{st.label}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0 text-fg-subtle transition-transform group-open:rotate-90">
                        <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <div className="pb-5">
                      <div className="max-w-[420px]">
                        <MessageBubble body={m.body} time={m.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} />
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
