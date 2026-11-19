import { requireUser } from "@/lib/auth";
import { cols } from "@/lib/db";
import { messagingMode } from "@/lib/whatsapp";
import { verifyMode } from "@/lib/verify";
import { llmEnabled } from "@/lib/llm";
import { timeAgo } from "@/lib/time";
import SettingsExtra from "@/edition/settings-extra";
import { PhoneSection, AlertPrefs, DangerZone } from "./sections";

export const metadata = { title: "Settings" };

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-border py-10 sm:grid-cols-[220px_1fr] sm:gap-10">
      <div>
        <h2 className="text-[15px] font-medium">{title}</h2>
        {desc && <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{desc}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const { sources } = await cols();
  const states = await sources.find().sort({ _id: 1 }).toArray();

  return (
    <div className="max-w-3xl">
      <h1 className="display mb-12 text-[44px] sm:text-[52px]">Settings</h1>

      <Row title="WhatsApp" desc="Where alerts are sent.">
        <PhoneSection phone={user.phone?.e164} />
      </Row>

      <Row title="Alerts" desc="Lower-severity issues still show in your dashboard, just without a message.">
        <AlertPrefs enabled={user.prefs.alertsEnabled} minSeverity={user.prefs.minSeverity} hasPhone={Boolean(user.phone)} />
      </Row>

      <SettingsExtra user={user} />

      <Row title="Sources" desc="Checked automatically every few minutes.">
        <ul className="divide-y divide-border border-y border-border text-[14px]">
          {states.length === 0 && <li className="py-3 text-fg-muted">First check hasn&apos;t finished yet.</li>}
          {states.map((s) => (
            <li key={s._id} className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${s.lastError ? "bg-warn" : "bg-accent"}`} />
                {s.name}
              </span>
              <span className="truncate text-right text-[12px] text-fg-subtle" title={s.lastError}>
                {s.lastError ? `Error: ${s.lastError.slice(0, 40)}` : s.lastOkAt ? `OK · ${timeAgo(s.lastOkAt)}` : "Pending"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-fg-subtle">
          WhatsApp: {messagingMode() === "twilio" ? "Twilio" : "console (local)"} · Verification: {verifyMode()} · AI summaries: {llmEnabled() ? "on" : "off"}
        </p>
      </Row>

      <Row title="Account" desc={user.email}>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/logout" className="btn-ghost btn-sm">
            Log out
          </a>
          <DangerZone />
        </div>
      </Row>
    </div>
  );
}
