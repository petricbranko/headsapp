import { requireUser } from "@/lib/auth";
import { messagingMode } from "@/lib/whatsapp";
import { Onboarding } from "./onboarding";
import { stackLimit, paywall, edition } from "@/edition";

export const metadata = { title: "Get set up" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const { max, upgradeHint } = await stackLimit(user);
  const pay = await paywall(user);
  // Resume where the user left off (e.g. coming back from checkout).
  const initialStep = !user.stack.length ? 0 : pay ? "pay" : !user.phone ? 1 : 0;
  return <Onboarding withSubscribe={edition.billing} initialStep={initialStep} paywall={pay} max={max} limitHint={upgradeHint} initialStack={user.stack.map((s) => s.key)} hasPhone={Boolean(user.phone)} phone={user.phone?.e164} consoleMode={messagingMode() === "console"} />;
}
