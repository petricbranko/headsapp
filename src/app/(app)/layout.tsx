import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { planLabel } from "@/edition";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = planLabel(user);
  const initial = (user.name || user.email || "?").slice(0, 1).toUpperCase();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5 sm:gap-6">
          <Logo href="/dashboard" />
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            {plan && <span className="rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium text-fg-muted">{plan}</span>}
            <span className="hidden size-7 place-items-center sm:grid rounded-full bg-bg-muted text-[12px] font-semibold text-fg-muted" title={user.email}>
              {initial}
            </span>
            <a href="/logout" className="hidden text-[13px] text-fg-subtle hover:text-fg sm:inline">
              Log out
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">{children}</main>
    </div>
  );
}
