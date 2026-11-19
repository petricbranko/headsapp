import { redirect } from "next/navigation";
import { authMode } from "@/lib/env";
import { getIdentity } from "@/lib/auth";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getIdentity()) redirect("/dashboard");
  const mode = authMode();

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm animate-in">
        <Logo href="/" />
        <h1 className="mt-10 text-[28px] font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[15px] text-fg-muted">Watch your stack. Get a WhatsApp message when it matters.</p>

        {mode === "auth0" && (
          <div className="mt-8 space-y-3">
            <a href="/auth/login" className="btn-primary h-11 w-full">
              Continue
            </a>
            <a href="/auth/login?screen_hint=signup" className="btn-ghost h-11 w-full">
              Create an account
            </a>
          </div>
        )}

        {mode === "dev" && (
          <form action="/api/dev/login" method="post" className="mt-8 space-y-3">
            <input name="email" type="email" className="input" defaultValue="dev@localhost" aria-label="Email" />
            <button className="btn-primary h-11 w-full">Continue</button>
            <p className="pt-2 text-[13px] leading-relaxed text-fg-subtle">
              Local dev login. Auth0 isn&apos;t configured, so any email signs you in as a local test user. This is disabled in production builds.
            </p>
          </form>
        )}

        {mode === "unconfigured" && (
          <div className="mt-8 rounded-xl border border-border bg-bg-subtle p-4 text-sm text-fg-muted">
            Sign-in isn&apos;t configured. Set <code className="font-mono text-fg">AUTH0_DOMAIN</code>, <code className="font-mono text-fg">AUTH0_CLIENT_ID</code>,{" "}
            <code className="font-mono text-fg">AUTH0_CLIENT_SECRET</code> and <code className="font-mono text-fg">AUTH0_SECRET</code>.
          </div>
        )}
      </div>
    </main>
  );
}
