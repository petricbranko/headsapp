import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { cols, ObjectId } from "@/lib/db";
import { labelForKey } from "@/lib/catalog";
import { SeverityBadge } from "@/components/severity";
import { ToolLogo } from "@/components/tool-logo";
import { Icon } from "@/components/icons";

export const metadata = { title: "Incident" };

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  const keys = user.stack.map((s) => s.key);
  const { incidents, alerts } = await cols();
  const inc = await incidents.findOne({ _id: new ObjectId(id), targets: { $in: keys } });
  if (!inc) notFound();
  const alert = await alerts.findOne({ userId: user._id, incidentId: inc._id, kind: "incident" });
  const mine = inc.targets.filter((t) => keys.includes(t));

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
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-fg-subtle">What happened</h2>
            <p className="mt-3 text-[15px] leading-[1.7] text-fg">{inc.whatHappened}</p>
          </section>
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-fg-subtle">What to do</h2>
            <ol className="mt-3 space-y-2.5">
              {inc.whatToDo.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-[1.6]">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-text">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
          <a href={inc.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary">
            Read the full report <Icon name="external" size={14} />
          </a>
        </div>
        <aside className="card h-fit p-5 text-[13px]">
          <div className="text-fg-muted">WhatsApp alert</div>
          <div className="mt-1 text-[14px] font-medium">
            {alert?.status === "sent" || alert?.status === "logged" ? "Sent to you" : alert?.reason === "duplicate" ? "Skipped (already alerted)" : alert?.reason === "daily_cap" ? "Skipped (daily limit)" : "Not sent"}
          </div>
          {!alert && <p className="mt-2 leading-relaxed text-fg-subtle">Older than 48 hours or below your alert threshold, so it&apos;s listed here instead.</p>}
          {alert && <div className="mt-1 text-fg-subtle">{alert.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>}
        </aside>
      </div>
    </div>
  );
}
