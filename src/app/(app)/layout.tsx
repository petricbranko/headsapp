import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { planLabel } from "@/edition";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = planLabel(user);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5 sm:gap-8">
          <Logo href="/dashboard" />
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            {plan && <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-[12px] font-medium text-fg-muted">{plan}</span>}
            <span className="hidden max-w-[180px] truncate text-[13px] text-fg-subtle md:inline">{user.email}</span>
            <a href="/logout" className="hidden text-[13px] text-fg-subtle hover:text-fg sm:inline">
              Log out
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-28 pt-10 sm:pt-14">{children}</main>
    </div>
  );
}
