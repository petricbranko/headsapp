import { requireUser } from "@/lib/auth";
import SettingsExtra from "@/edition/settings-extra";
import { PageHeader } from "@/components/page-header";
import { PhoneSection, AlertPrefs, DangerZone } from "./sections";
import { SettingsCard } from "@/components/settings-card";
import { formatPhone } from "@/lib/text";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <SettingsCard title="WhatsApp number" description="Where alerts are sent. We verify it with a one-time code.">
          <PhoneSection phone={user.phone?.e164} display={user.phone ? formatPhone(user.phone.e164) : undefined} />
        </SettingsCard>
        <SettingsCard title="Alerts" description="Choose what is worth a message. Everything else still shows up under Incidents.">
          <AlertPrefs enabled={user.prefs.alertsEnabled} minSeverity={user.prefs.minSeverity} hasPhone={Boolean(user.phone)} />
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
