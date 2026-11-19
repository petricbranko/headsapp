import { requireUser } from "@/lib/auth";
import { messagingMode } from "@/lib/whatsapp";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Get set up" };

export default async function OnboardingPage() {
  const user = await requireUser();
  return <Onboarding initialStack={user.stack.map((s) => s.key)} hasPhone={Boolean(user.phone)} phone={user.phone?.e164} consoleMode={messagingMode() === "console"} />;
}
