import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { cols } from "@/lib/db";
import { labelForKey } from "@/lib/catalog";
import { messagingMode } from "@/lib/whatsapp";
import { timeAgo, clock } from "@/lib/time";
import { maskPhone } from "@/lib/text";
import { SeverityBadge } from "@/components/severity";
import { WhatsAppMock } from "@/components/whatsapp-mock";
import { CheckNow } from "./check-now";
import { SEVERITY_RANK } from "@/lib/types";

export const metadata = { title: "Dashboard" };

const SOURCE_LABEL: Record<string, string> = { ghsa: "GitHub advisory", kev: "Actively exploited", status: "Status page", news: "News" };

function day(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const showAll = (await searchParams).all === "1";
  const user = await requireUser();
  if (!user.onboardedAt && !user.stack.length) redirect("/onboarding");

  const { incidents, alerts, messages, sources } = await cols();
  const keys = user.stack.map((s) => s.key);
  const [feed, alerted, recentMessages, sourceStates] = await Promise.all([
    keys.length
      ? incidents
          .find(showAll ? { targets: { $in: keys } } : { targets: { $in: keys }, severity: { $in: ["critical", "high", "medium"] }, publishedAt: { $gte: new Date(Date.now() - 60 * 864e5) } })
          .sort({ publishedAt: -1 })
          .limit(showAll ? 200 : 12)
          .toArray()
      : [],
    alerts.find({ userId: user._id, kind: "incident", status: { $in: ["sent", "logged"] } }, { projection: { incidentId: 1 } }).toArray(),
    messages.find({ userId: user._id, kind: { $ne: "verify" } }).sort({ createdAt: -1 }).limit(4).toArray(),
    sources.find().toArray(),
  ]);
  const alertedIds = new Set(alerted.map((a) => a.incidentId?.toString()));
  const lastRun = sourceStates.map((s) => s.lastRunAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
  const consoleMode = messagingMode() === "console";
  const weekAgo = Date.now() - 7 * 864e5;
  const thisWeek = feed.filter((i) => SEVERITY_RANK[i.severity] >= SEVERITY_RANK[user.prefs.minSeverity] && i.publishedAt.getTime() > weekAgo);

  return (
    <div>
      <section className="flex flex-col gap-6 pb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-[44px] sm:text-[52px]">
            {thisWeek.length ? (
              <>
                {thisWeek.length} {thisWeek.length === 1 ? "incident" : "incidents"} <span className="italic text-fg-muted">this week.</span>
              </>
            ) : (
              <>
                All quiet <span className="italic text-fg-muted">this week.</span>
              </>
            )}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-fg-muted">
            <span className="inline-flex items-center gap-2 text-fg">
              <span className="size-[7px] rounded-full bg-accent pulse-dot" />
              Watching {keys.length} {keys.length === 1 ? "tool" : "tools"}
            </span>
            <span className="text-fg-subtle">·</span>
            {user.phone ? <span>Alerts to {maskPhone(user.phone.e164)}</span> : <Link href="/settings" className="text-fg underline decoration-border-strong underline-offset-4">Add WhatsApp number</Link>}
            <span className="text-fg-subtle">·</span>
            <span>{lastRun ? `Checked ${timeAgo(lastRun)}` : "First check running"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/stack" className="btn-ghost btn-sm">
            Edit stack
          </Link>
          <CheckNow />
        </div>
      </section>

      {!user.phone && (
        <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-bg-subtle px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <div className="text-[15px] font-medium">You won&apos;t get alerts yet</div>
            <div className="text-[14px] text-fg-muted">Add your WhatsApp number. It takes 20 seconds.</div>
          </div>
          <Link href="/settings" className="btn-primary btn-sm">
            Add number
          </Link>
        </div>
      )}

      <div className="grid gap-14 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-2 flex items-baseline justify-between border-b border-border pb-3">
            <h2 className="text-[14px] font-medium">{showAll ? "All incidents" : "Recent incidents"}</h2>
            <Link href={showAll ? "/dashboard" : "/dashboard?all=1"} className="text-[13px] text-fg-subtle hover:text-fg">
              {showAll ? "Recent only" : "View all"}
            </Link>
          </div>
          {feed.length === 0 ? (
            <div className="py-16">
              <p className="display text-[26px]">Nothing has hit your stack.</p>
              <p className="mt-2 text-[14px] text-fg-muted">That&apos;s the goal. When something does, it shows up here and on WhatsApp.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {feed.map((inc) => {
                const mine = inc.targets.filter((t) => keys.includes(t));
                return (
                  <li key={inc._id!.toString()}>
                    <details className="group">
                      <summary className="-mx-3 flex cursor-pointer list-none gap-5 rounded-xl px-3 py-4 transition-colors hover:bg-bg-subtle [&::-webkit-details-marker]:hidden">
                        <div className="w-14 shrink-0 pt-[2px] text-[13px] tabular-nums text-fg-subtle">{day(inc.publishedAt)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-medium leading-snug tracking-[-0.005em] text-fg">{inc.title}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-fg-muted">
                            <SeverityBadge severity={inc.severity} />
                            <span className="text-fg-subtle">·</span>
                            <span>{mine.slice(0, 3).map(labelForKey).join(", ")}</span>
                            <span className="text-fg-subtle">·</span>
                            <span>{SOURCE_LABEL[inc.source]}</span>
                            {alertedIds.has(inc._id!.toString()) && (
                              <>
                                <span className="text-fg-subtle">·</span>
                                <span className="text-accent">Sent to WhatsApp</span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="mt-1.5 shrink-0 text-fg-subtle transition-transform group-open:rotate-90">
                          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <div className="pb-6 pl-[76px] pr-6 text-[14px] leading-relaxed">
                        <p className="text-fg-muted">{inc.whatHappened}</p>
                        <div className="mt-4 text-[13px] font-medium">What to do</div>
                        <ol className="mt-1.5 space-y-1 text-fg-muted">
                          {inc.whatToDo.map((s, i) => (
                            <li key={i} className="flex gap-2.5">
                              <span className="tabular-nums text-fg-subtle">{i + 1}.</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                        <a href={inc.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex items-center gap-1 text-[13px] text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg">
                          Read on {inc.sourceName}
                          <span aria-hidden>↗</span>
                        </a>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside>
          <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
            <h2 className="text-[14px] font-medium">WhatsApp</h2>
            <span className="text-[13px] text-fg-subtle">{consoleMode ? "Local mode" : "Live"}</span>
          </div>
          {recentMessages.length ? (
            <WhatsAppMock messages={recentMessages.reverse().map((m) => ({ body: m.body, time: clock(m.createdAt) }))} />
          ) : (
            <p className="text-[14px] text-fg-muted">No messages yet.</p>
          )}
          {consoleMode && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-subtle">Twilio isn&apos;t configured, so messages are printed to the server console and shown here.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
