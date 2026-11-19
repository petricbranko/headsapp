import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";
import SidebarExtra from "@/edition/sidebar-extra";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initial = (user.name || user.email || "?").slice(0, 1).toUpperCase();
  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-border bg-bg-subtle px-3 py-4 lg:flex">
        <div className="px-2.5 pb-6 pt-1">
          <Logo href="/dashboard" />
        </div>
        <NavLinks />
        <div className="mt-auto space-y-3">
          <SidebarExtra user={user} />
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <span className="grid size-7 place-items-center rounded-full bg-bg-muted text-[12px] font-semibold text-fg-muted">{initial}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg-muted" title={user.email}>
              {user.email}
            </span>
            <a href="/logout" className="grid size-7 place-items-center rounded-md text-fg-subtle hover:bg-bg-hover hover:text-fg" title="Log out" aria-label="Log out">
              <Icon name="logout" />
            </a>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <Logo href="/dashboard" />
          <a href="/logout" className="text-[13px] text-fg-muted">
            Log out
          </a>
        </div>
        <NavLinks variant="top" />
      </header>

      <div className="lg:pl-[256px]">
        <main className="px-5 py-8 sm:px-8 lg:px-14 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
