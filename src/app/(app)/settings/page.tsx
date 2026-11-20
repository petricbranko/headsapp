import { requireUser } from "@/lib/auth";
import SettingsExtra from "@/edition/settings-extra";
import { PageHeader } from "@/components/page-header";
import { TelegramSection, AlertPrefs, DangerZone } from "./sections";
import { SettingsCard } from "@/components/settings-card";
import { telegramLabel } from "@/lib/telegram";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="max-w-[1000px]">
        <SettingsCard title="Telegram" description="Where alerts are sent, as messages from the HeadsApp bot.">
          <TelegramSection label={telegramLabel(user.telegram) || undefined} since={user.telegram?.connectedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
        </SettingsCard>
        <SettingsCard title="Alerts" description="Choose what is worth a message. Everything else still shows up under Incidents.">
          <AlertPrefs enabled={user.prefs.alertsEnabled} minSeverity={user.prefs.minSeverity} hasTelegram={Boolean(user.telegram)} />
        </SettingsCard>
        <SettingsExtra user={user} />
        <SettingsCard title="Account" description={user.email}>
          <div className="flex flex-wrap gap-2">
            <a href="/logout" className="btn-secondary">
              Log out
            </a>
            <DangerZone />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
