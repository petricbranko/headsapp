import { requireUser } from "@/lib/auth";
import { stackLimit } from "@/edition";
import { PageHeader } from "@/components/page-header";
import { StackEditor } from "./stack-editor";

export const metadata = { title: "Stack" };

export default async function StackPage() {
  const user = await requireUser();
  const { max, upgradeHint } = await stackLimit(user);
  return (
    <div>
      <PageHeader title="Stack" description="Everything here is monitored around the clock. Changes save automatically." />
      <StackEditor initial={user.stack.map((s) => s.key)} max={max} limitHint={upgradeHint} />
    </div>
  );
}
