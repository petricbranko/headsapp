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
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icons";

export const metadata = { title: "Overview" };

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card px-5 py-5">
      <div className="text-[13px] text-fg-muted">{label}</div>
      <div className="heading mt-2 text-[28px] tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-fg-subtle">{hint}</div>}
    </div>
  );
}

export default async function Overview() {
  const user = await requireUser();
  if (!user.onboardedAt && !user.stack.length) redirect("/onboarding");

  const { incidents, alerts, messages } = await cols();
  const keys = user.stack.map((s) => s.key);
  const d30 = new Date(Date.now() - 30 * 864e5);
  const d14 = new Date(Date.now() - 14 * 864e5);
  const [attention, recent30, alertsSent, lastMsgs, perTool] = await Promise.all([
    keys.length ? incidents.find({ targets: { $in: keys }, severity: { $in: ["critical", "high"] }, publishedAt: { $gte: d14 } }).sort({ publishedAt: -1 }).limit(8).toArray() : [],
    keys.length ? incidents.countDocuments({ targets: { $in: keys }, publishedAt: { $gte: d30 } }) : 0,
    alerts.countDocuments({ userId: user._id, kind: "incident", status: { $in: ["sent", "logged"] }, createdAt: { $gte: d30 } }),
    messages.find({ userId: user._id, kind: { $in: ["alert", "test"] } }).sort({ createdAt: -1 }).limit(4).toArray(),
    keys.length
      ? incidents
          .aggregate<{ _id: string; n: number }>([{ $match: { targets: { $in: keys }, publishedAt: { $gte: d30 } } }, { $unwind: "$targets" }, { $match: { targets: { $in: keys } } }, { $group: { _id: "$targets", n: { $sum: 1 } } }])
          .toArray()
      : [],
  ]);
  const counts = new Map(perTool.map((p) => [p._id, p.n]));
  const lastAlert = lastMsgs.find((m) => m.kind === "alert");

  return (
    <div>
      <PageHeader
        title="Overview"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-2 font-medium text-fg">
              <span className="size-2 rounded-full bg-accent pulse-dot" /> Monitoring {keys.length} {keys.length === 1 ? "tool" : "tools"}
            </span>
            <span className="text-fg-subtle">·</span>
            {user.phone ? <span>Alerts go to {maskPhone(user.phone.e164)} on WhatsApp</span> : <span>No WhatsApp number yet</span>}
          </span>
        }
        actions={
          <Link href="/stack" className="btn-secondary">
            <Icon name="plus" /> Add tools
          </Link>
        }
      />

      {!user.phone && (
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-accent/30 bg-accent-soft px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[14px] font-medium">You won&apos;t get alerts yet</div>
            <div className="text-[13px] text-fg-muted">Add your WhatsApp number. It takes 20 seconds.</div>
          </div>
          <Link href="/settings" className="btn-primary btn-sm">
            Add WhatsApp number
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tools monitored" value={keys.length} />
        <Stat label="Incidents, last 30 days" value={recent30} hint="Across your stack" />
        <Stat label="Alerts sent, last 30 days" value={alertsSent} hint="Only high-signal ones" />
        <Stat label="Last alert" value={<span className="text-[22px]">{lastAlert ? timeAgo(lastAlert.createdAt) : "None yet"}</span>} />
      </div>

      <div className="mt-10 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Needs attention</h2>
              <p className="text-[13px] text-fg-muted">High and critical incidents from the last 14 days</p>
            </div>
            <Link href="/incidents" className="btn-ghost btn-sm">
              All incidents
            </Link>
          </div>
          {attention.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="mt-4 text-[15px] font-medium">Nothing needs your attention</div>
              <p className="mt-1 text-[13px] text-fg-muted">No high or critical incidents hit your stack in the last two weeks.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {attention.map((inc) => {
                const mine = inc.targets.filter((t) => keys.includes(t));
                return (
                  <li key={inc._id!.toString()}>
                    <Link href={`/incidents/${inc._id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-bg-subtle">
                      <ToolLogo stackKey={mine[0]} name={labelForKey(mine[0])} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{inc.title}</div>
                        <div className="mt-0.5 text-[13px] text-fg-muted">
                          {mine.map(labelForKey).join(", ")} · {timeAgo(inc.publishedAt)}
                        </div>
                      </div>
                      <SeverityBadge severity={inc.severity} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Your stack</h2>
              <Link href="/stack" className="btn-ghost btn-sm">
                Manage
              </Link>
            </div>
            <ul className="max-h-[340px] divide-y divide-border overflow-y-auto">
              {user.stack.map((s) => (
                <li key={s.key} className="flex items-center gap-3 px-5 py-2.5">
                  <ToolLogo stackKey={s.key} name={s.name} size={28} />
                  <span className="flex-1 truncate text-[14px]">{s.name}</span>
                  <span className={`text-[12px] tabular-nums ${counts.get(s.key) ? "text-fg-muted" : "text-fg-subtle"}`}>
                    {counts.get(s.key) ? `${counts.get(s.key)} in 30d` : "Clear"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Recent alerts</h2>
              <Link href="/alerts" className="btn-ghost btn-sm">
                View all
              </Link>
            </div>
            {lastMsgs.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-fg-muted">No alerts sent yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lastMsgs.map((m) => {
                  const s = summarizeMessage(m.body);
                  return (
                    <li key={m._id!.toString()} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3 text-[12px] text-fg-subtle">
                        <span>{m.kind === "test" ? "Test alert" : s.header}</span>
                        <span>{timeAgo(m.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[13.5px]">{s.title}</div>
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
