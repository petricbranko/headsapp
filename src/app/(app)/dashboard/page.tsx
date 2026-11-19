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
    <div className="max-w-[1180px]">
      {/* Status: answers "am I covered, and do I need to do anything?" */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading text-[30px]">{covered ? "All clear" : `${open.length} ${open.length === 1 ? "incident needs" : "incidents need"} your attention`}</h1>
          <p className="mt-2 text-[14px] text-fg-muted">
            Monitoring {keys.length} {keys.length === 1 ? "tool" : "tools"}
            {user.phone ? <>, alerts go to {maskPhone(user.phone.e164)}</> : null}
            {lastCheck?.lastOkAt ? <>. Last checked {timeAgo(lastCheck.lastOkAt)}.</> : "."}
          </p>
          {!user.phone && (
            <Link href="/settings" className="mt-2 inline-block text-[14px] font-medium text-fg underline underline-offset-4">
              Add your WhatsApp number to get alerts
            </Link>
          )}
        </div>
        <Link href="/stack" className="btn-secondary shrink-0">
          <Icon name="plus" /> Add tools
        </Link>
      </header>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-14 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <section>
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <h2 className="text-[14px] font-semibold">Needs your attention</h2>
            <Link href="/incidents" className="text-[13px] text-fg-muted hover:text-fg">
              All incidents
            </Link>
          </div>
          {open.length === 0 ? (
            <p className="py-10 text-[14px] text-fg-muted">Nothing to do. We&apos;ll message you on WhatsApp the moment something hits your stack.</p>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((inc) => {
                const mine = inc.targets.filter((t) => keys.includes(t));
                return (
                  <li key={inc._id!.toString()} className="flex items-start gap-4 py-5">
                    <ToolLogo stackKey={mine[0]} name={labelForKey(mine[0])} size={32} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/incidents/${inc._id}`} className="block text-[15px] font-medium leading-snug hover:underline hover:underline-offset-4">
                        {inc.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
                        <SeverityBadge severity={inc.severity} />
                        <span>{mine.map(labelForKey).join(", ")}</span>
                        <span>{timeAgo(inc.publishedAt)}</span>
                      </div>
                      {inc.whatToDo[0] && <p className="mt-2 text-[14px] text-fg">{inc.whatToDo[0]}</p>}
                      <div className="mt-3">
                        <IncidentActions id={inc._id!.toString()} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-12">
          <section>
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <h2 className="text-[14px] font-semibold">Your stack</h2>
              <Link href="/stack" className="text-[13px] text-fg-muted hover:text-fg">
                Edit
              </Link>
            </div>
            <ul className="max-h-[360px] overflow-y-auto">
              {stack.map((s) => {
                const n = openByTool.get(s.key) ?? 0;
                return (
                  <li key={s.key} className="flex items-center gap-3 py-2">
                    <ToolLogo stackKey={s.key} name={s.name} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[14px]">{s.name}</span>
                    <span className={`text-[13px] ${n ? "font-medium text-fg" : "text-fg-subtle"}`}>{n ? `${n} open` : "OK"}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <h2 className="text-[14px] font-semibold">Recent alerts</h2>
              <Link href="/alerts" className="text-[13px] text-fg-muted hover:text-fg">
                All alerts
              </Link>
            </div>
            {lastMsgs.length === 0 ? (
              <p className="py-4 text-[13.5px] text-fg-muted">No alerts yet.</p>
            ) : (
              <ul>
                {lastMsgs.map((m) => {
                  const s = summarizeMessage(m.body);
                  return (
                    <li key={m._id!.toString()}>
                      <Link href="/alerts" className="block py-2.5 hover:text-fg">
                        <div className="truncate text-[14px]">{s.title}</div>
                        <div className="text-[12.5px] text-fg-subtle">
                          {m.kind === "test" ? "Test alert" : s.header}, {timeAgo(m.createdAt)}
                        </div>
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
