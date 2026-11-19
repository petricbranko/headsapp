import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { cols } from "@/lib/db";
import { labelForKey } from "@/lib/catalog";
import { timeAgo } from "@/lib/time";
import { maskPhone } from "@/lib/text";
import { summarizeMessage } from "@/lib/alert-text";
import { SeverityBadge } from "@/components/severity";
import { ToolLogo } from "@/components/tool-logo";
import { Icon } from "@/components/icons";
import { IncidentActions } from "@/components/incident-actions";

export const metadata = { title: "Overview" };

const ATTENTION_DAYS = 14;

export default async function Overview() {
  const user = await requireUser();
  if (!user.onboardedAt && !user.stack.length) redirect("/onboarding");

  const { incidents, messages, sources, states } = await cols();
  const keys = user.stack.map((s) => s.key);
  const since = new Date(Date.now() - ATTENTION_DAYS * 864e5);
  const [recent, lastMsgs, lastCheck, handled] = await Promise.all([
    keys.length ? incidents.find({ targets: { $in: keys }, severity: { $in: ["critical", "high"] }, publishedAt: { $gte: since } }).sort({ publishedAt: -1 }).limit(30).toArray() : [],
    messages.find({ userId: user._id, kind: { $in: ["alert", "test"] } }).sort({ createdAt: -1 }).limit(4).toArray(),
    sources.find({ lastOkAt: { $exists: true } }).sort({ lastOkAt: -1 }).limit(1).next(),
    states.find({ userId: user._id }).toArray(),
  ]);
  const handledIds = new Set(handled.map((h) => h.incidentId.toString()));
  const open = recent.filter((i) => !handledIds.has(i._id!.toString()));
  const openByTool = new Map<string, number>();
  for (const inc of open) for (const t of inc.targets) if (keys.includes(t)) openByTool.set(t, (openByTool.get(t) ?? 0) + 1);

  const covered = open.length === 0;
  const stack = [...user.stack].sort((a, b) => (openByTool.get(b.key) ?? 0) - (openByTool.get(a.key) ?? 0));

  return (
    <div className="max-w-[1280px]">
      {/* Status: answers "am I covered, and do I need to do anything?" */}
      <section className={`flex flex-col gap-6 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 ${covered ? "border-border bg-bg-subtle" : "border-[#f6caca] bg-[#fff7f7]"}`}>
        <div className="flex items-start gap-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${covered ? "bg-accent-soft text-accent" : "bg-[#fdecec] text-[#d9342b]"}`}>
            {covered ? (
              <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.5v4.5M8 11.5v.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
            )}
          </span>
          <div>
            <h1 className="heading text-[24px] sm:text-[26px]">
              {covered ? "You're covered" : `${open.length} ${open.length === 1 ? "incident needs" : "incidents need"} your attention`}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-accent pulse-dot" />
                Monitoring {keys.length} {keys.length === 1 ? "tool" : "tools"}
              </span>
              <span className="text-fg-subtle">/</span>
              {user.phone ? (
                <span>WhatsApp alerts to {maskPhone(user.phone.e164)}</span>
              ) : (
                <Link href="/settings" className="font-medium text-danger underline-offset-4 hover:underline">
                  Add a WhatsApp number to get alerts
                </Link>
              )}
              {lastCheck?.lastOkAt && (
                <>
                  <span className="text-fg-subtle">/</span>
                  <span>Last check {timeAgo(lastCheck.lastOkAt)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <Link href="/stack" className="btn-secondary shrink-0">
          <Icon name="plus" /> Add tools
        </Link>
      </section>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px] [&>*]:min-w-0">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Needs your attention</h2>
            <Link href="/incidents" className="text-[13px] text-fg-muted hover:text-fg">
              View all incidents
            </Link>
          </div>
          {open.length === 0 ? (
            <div className="card px-6 py-12 text-center">
              <p className="text-[15px] font-medium">Nothing to do right now</p>
              <p className="mx-auto mt-1 max-w-[420px] text-[14px] text-fg-muted">
                No open high or critical incidents for your stack in the last {ATTENTION_DAYS} days. We&apos;ll message you on WhatsApp the moment that changes.
              </p>
            </div>
          ) : (
            <ul className="card divide-y divide-border overflow-hidden">
              {open.map((inc) => {
                const mine = inc.targets.filter((t) => keys.includes(t));
                return (
                  <li key={inc._id!.toString()} className="p-5">
                    <div className="flex items-start gap-4">
                      <ToolLogo stackKey={mine[0]} name={labelForKey(mine[0])} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-fg-muted">
                          <SeverityBadge severity={inc.severity} />
                          <span>{mine.map(labelForKey).join(", ")}</span>
                          <span className="text-fg-subtle">/</span>
                          <span>{timeAgo(inc.publishedAt)}</span>
                        </div>
                        <Link href={`/incidents/${inc._id}`} className="mt-1.5 block text-[15px] font-medium leading-snug hover:text-accent-text">
                          {inc.title}
                        </Link>
                        {inc.whatToDo[0] && (
                          <p className="mt-1.5 text-[13.5px] text-fg-muted">
                            <span className="font-medium text-fg">Next step:</span> {inc.whatToDo[0]}
                          </p>
                        )}
                        <div className="mt-3.5">
                          <IncidentActions id={inc._id!.toString()} />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Your stack</h2>
              <Link href="/stack" className="text-[13px] text-fg-muted hover:text-fg">
                Manage
              </Link>
            </div>
            <ul className="card max-h-[380px] divide-y divide-border overflow-y-auto">
              {stack.map((s) => {
                const n = openByTool.get(s.key) ?? 0;
                return (
                  <li key={s.key} className="flex items-center gap-3 px-4 py-2.5">
                    <ToolLogo stackKey={s.key} name={s.name} size={28} />
                    <span className="min-w-0 flex-1 truncate text-[14px]">{s.name}</span>
                    {n ? (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#d9342b]">
                        <span className="size-1.5 rounded-full bg-[#d9342b]" /> {n === 1 ? "Needs attention" : `${n} open`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-subtle">
                        <span className="size-1.5 rounded-full bg-accent" /> No action needed
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Recent WhatsApp alerts</h2>
              <Link href="/alerts" className="text-[13px] text-fg-muted hover:text-fg">
                View all
              </Link>
            </div>
            {lastMsgs.length === 0 ? (
              <p className="card px-5 py-6 text-[13.5px] text-fg-muted">No alerts yet. You&apos;ll see every message we send here.</p>
            ) : (
              <ul className="card divide-y divide-border">
                {lastMsgs.map((m) => {
                  const s = summarizeMessage(m.body);
                  return (
                    <li key={m._id!.toString()}>
                      <Link href="/alerts" className="block px-4 py-3 hover:bg-bg-subtle">
                        <div className="flex items-center justify-between gap-3 text-[12px] text-fg-subtle">
                          <span>{m.kind === "test" ? "Test alert" : s.header}</span>
                          <span>{timeAgo(m.createdAt)}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[13.5px]">{s.title}</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
