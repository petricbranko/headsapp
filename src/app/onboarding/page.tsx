import { requireUser } from "@/lib/auth";
import { messagingMode } from "@/lib/whatsapp";
import { Onboarding } from "./onboarding";
import { stackLimit } from "@/edition";

export const metadata = { title: "Get set up" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const { max, upgradeHint } = await stackLimit(user);
  return <Onboarding max={max} limitHint={upgradeHint} initialStack={user.stack.map((s) => s.key)} hasPhone={Boolean(user.phone)} phone={user.phone?.e164} consoleMode={messagingMode() === "console"} />;
}
