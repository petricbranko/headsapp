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

const SOURCE_LABEL: Record<string, string> = { ghsa: "Advisory", kev: "Actively exploited", status: "Status page", news: "News" };

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
    messages.find({ userId: user._id, kind: { $ne: "verify" } }).sort({ createdAt: -1 }).limit(6).toArray(),
    sources.find().toArray(),
  ]);
  const alertedIds = new Set(alerted.map((a) => a.incidentId?.toString()));
  const lastRun = sourceStates.map((s) => s.lastRunAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
  const consoleMode = messagingMode() === "console";
  const weekAgo = Date.now() - 7 * 864e5;
  const relevant = feed.filter((i) => SEVERITY_RANK[i.severity] >= SEVERITY_RANK[user.prefs.minSeverity] && i.publishedAt.getTime() > weekAgo);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-accent">
            <span className="size-1.5 rounded-full bg-accent pulse-dot" />
            Watching {keys.length} tool{keys.length === 1 ? "" : "s"}
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
            {relevant.length ? `${relevant.length} incident${relevant.length === 1 ? "" : "s"} hit your stack this week` : "All quiet on your stack this week"}
          </h1>
          <p className="mt-1.5 text-[15px] text-fg-muted">
            {user.phone ? <>Alerts go to {maskPhone(user.phone.e164)} on WhatsApp.</> : <>Add your WhatsApp number to get alerts.</>}{" "}
            {lastRun ? <>Sources checked {timeAgo(lastRun)}.</> : <>First check is running…</>}
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
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-bg-subtle p-5 sm:flex-row sm:items-center">
          <div>
            <div className="text-[15px] font-medium">You won&apos;t get alerts yet</div>
            <div className="text-[14px] text-fg-muted">Add your WhatsApp number. It takes 20 seconds.</div>
          </div>
          <Link href="/settings" className="btn-accent btn-sm">
            Add WhatsApp number
          </Link>
        </div>
      )}

      {consoleMode && (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-[13px] text-fg-muted">
          Local mode: Twilio isn&apos;t configured, so WhatsApp messages are printed to the server console and shown under <span className="text-fg">Messages</span>.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="eyebrow">{showAll ? "All incidents for your stack" : "Recent incidents for your stack"}</h2>
            <Link href={showAll ? "/dashboard" : "/dashboard?all=1"} className="text-[12px] text-fg-subtle hover:text-fg">
              {showAll ? "Show recent" : "Show all"}
            </Link>
          </div>
          {feed.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <div className="text-[15px] font-medium">Nothing has hit your stack.</div>
              <p className="mt-1 text-[14px] text-fg-muted">That&apos;s the goal. When something does, it shows up here and on WhatsApp.</p>
            </div>
          ) : (
            <ul className="card divide-y divide-border overflow-hidden">
              {feed.map((inc) => {
                const mine = inc.targets.filter((t) => keys.includes(t));
                return (
                  <li key={inc._id!.toString()}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none gap-4 px-5 py-4 transition-colors hover:bg-bg-subtle [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <SeverityBadge severity={inc.severity} />
                            {mine.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[12px] font-medium text-fg-muted">
                                {labelForKey(t)}
                              </span>
                            ))}
                            <span className="text-[12px] text-fg-subtle">{SOURCE_LABEL[inc.source]}</span>
                            {alertedIds.has(inc._id!.toString()) && <span className="text-[12px] font-medium text-accent">Alerted</span>}
                          </div>
                          <div className="mt-1.5 text-[15px] font-medium leading-snug text-fg">{inc.title}</div>
                        </div>
                        <div className="shrink-0 pt-0.5 text-[12px] text-fg-subtle">{timeAgo(inc.publishedAt)}</div>
                      </summary>
                      <div className="space-y-4 px-5 pb-5 text-[14px] leading-relaxed">
                        <p className="text-fg-muted">{inc.whatHappened}</p>
                        <div>
                          <div className="mb-1.5 text-[13px] font-medium">What to do</div>
                          <ul className="space-y-1 text-fg-muted">
                            {inc.whatToDo.map((s, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-accent">→</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <a href={inc.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-block text-[13px] text-fg underline underline-offset-4">
                          {inc.sourceName} ↗
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
          <h2 className="eyebrow mb-3">Messages</h2>
          {recentMessages.length ? (
            <WhatsAppMock messages={recentMessages.reverse().map((m) => ({ body: m.body, time: clock(m.createdAt) }))} />
          ) : (
            <div className="card px-5 py-8 text-center text-[14px] text-fg-muted">No messages yet.</div>
          )}
          {recentMessages.length > 0 && <p className="mt-2 text-[12px] text-fg-subtle">{consoleMode ? "Logged locally, not sent." : "Delivered via WhatsApp."}</p>}
        </aside>
      </div>
    </div>
  );
}
