import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { cols, ObjectId } from "@/lib/db";
import { labelForKey } from "@/lib/catalog";
import { SeverityBadge } from "@/components/severity";
import { ToolLogo } from "@/components/tool-logo";
import { Icon } from "@/components/icons";
import { IncidentActions } from "@/components/incident-actions";
import { SEVERITY_RANK } from "@/lib/types";

export const metadata = { title: "Incident" };

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  const keys = user.stack.map((s) => s.key);
  const { incidents, alerts, states } = await cols();
  const inc = await incidents.findOne({ _id: new ObjectId(id), targets: { $in: keys } });
  if (!inc) notFound();
  const [alert, mark] = await Promise.all([
    alerts.findOne({ userId: user._id, incidentId: inc._id, kind: "incident" }),
    states.findOne({ userId: user._id, incidentId: inc._id }),
  ]);
  const mine = inc.targets.filter((t) => keys.includes(t));
  const added = user.stack.filter((s) => mine.includes(s.key)).map((s) => s.addedAt.getTime());
  const sent = alert?.status === "sent" || alert?.status === "logged";
  // Tell the user the real reason, in their terms.
  const why = sent
    ? `Sent ${alert!.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
    : alert?.reason === "duplicate"
      ? "You were already alerted about this vulnerability from another source."
      : alert?.reason === "daily_cap"
        ? "You hit the daily alert limit, so it's listed here instead."
        : added.length && inc.fetchedAt.getTime() < Math.min(...added)
          ? "This was published before you added it to your stack, so we didn't message you."
          : SEVERITY_RANK[inc.severity] < SEVERITY_RANK[user.prefs.minSeverity]
            ? "It's below the severity you chose for WhatsApp alerts."
            : !user.prefs.alertsEnabled
              ? "WhatsApp alerts are paused in Settings."
              : !user.phone
                ? "Add a WhatsApp number in Settings to get alerts."
                : "It was more than 48 hours old when we found it.";

  return (
    <div className="max-w-[860px]">
      <Link href="/incidents" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg">
        <Icon name="back" size={14} /> Incidents
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <SeverityBadge severity={inc.severity} />
        <span className="text-[13px] text-fg-muted">
          {inc.publishedAt.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <h1 className="heading mt-3 text-[30px] leading-[1.15]">{inc.title}</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        {mine.map((k) => (
          <span key={k} className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg py-1 pl-1 pr-2.5 text-[13px]">
            <ToolLogo stackKey={k} name={labelForKey(k)} size={22} />
            {labelForKey(k)}
          </span>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">What happened</h2>
            <p className="mt-3 text-[15px] leading-[1.7] text-fg">{inc.whatHappened}</p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">What to do</h2>
            <ol className="mt-3 space-y-2.5">
              {inc.whatToDo.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-[1.6]">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-text">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
          <a href={inc.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg">
            Read the full report <Icon name="external" size={14} />
          </a>
        </div>
        <aside className="h-fit space-y-4 lg:sticky lg:top-8">
          <div className="card p-5">
            <div className="text-[14px] font-semibold">Dealt with it?</div>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">Mark it so it leaves your attention list. You can undo this anytime.</p>
            <div className="mt-4">
              <IncidentActions id={inc._id!.toString()} state={mark?.state} />
            </div>
          </div>
          <div className="card p-5 text-[13px]">
            <div className="text-[14px] font-semibold">WhatsApp alert</div>
            <p className={`mt-1 leading-relaxed ${sent ? "text-accent-text" : "text-fg-muted"}`}>{sent ? why : `Not sent. ${why}`}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
