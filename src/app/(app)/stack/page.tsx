import { requireUser } from "@/lib/auth";
import { stackLimit } from "@/edition";
import { StackEditor } from "./stack-editor";

export const metadata = { title: "Stack" };

export default async function StackPage() {
  const user = await requireUser();
  const { max } = await stackLimit(user);
  return (
    <div className="max-w-2xl">
      <h1 className="text-[28px] font-semibold tracking-tight">Your stack</h1>
      <p className="mt-1.5 text-[15px] text-fg-muted">Everything you pick here is watched around the clock. Changes save automatically.</p>
      <div className="mt-8">
        <StackEditor initial={user.stack.map((s) => s.key)} max={max} />
      </div>
    </div>
  );
}
