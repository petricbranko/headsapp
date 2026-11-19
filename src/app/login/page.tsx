import { redirect } from "next/navigation";
import { authMode } from "@/lib/env";
import { getIdentity } from "@/lib/auth";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getIdentity()) redirect("/dashboard");
  const mode = authMode();

  return (
    <div className="flex min-h-dvh flex-col bg-bg-subtle">
      <header className="px-6 py-5 lg:px-10">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pt-[10vh]">
        <div className="card w-full max-w-[420px] p-8 shadow-[var(--shadow-lg)] animate-in">
          <h1 className="heading text-[24px]">Sign in to HeadsApp</h1>
          <p className="mt-2 text-[14px] text-fg-muted">Security alerts for your stack, on WhatsApp.</p>

          {mode === "auth0" && (
            <div className="mt-7 space-y-2.5">
              <a href="/auth/login" className="btn-primary btn-lg w-full">
                Continue
              </a>
              <a href="/auth/login?screen_hint=signup" className="btn-secondary btn-lg w-full">
                Create an account
              </a>
            </div>
          )}

          {mode === "dev" && (
            <form action="/api/dev/login" method="post" className="mt-7 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium">Email</span>
                <input name="email" type="email" className="input h-11" defaultValue="dev@localhost" autoComplete="email" />
              </label>
              <button className="btn-primary btn-lg w-full">Continue</button>
              <p className="pt-2 text-[12.5px] leading-relaxed text-fg-subtle">Local dev login: Auth0 isn&apos;t configured, so any email signs you in as a test user. Disabled in production builds.</p>
            </form>
          )}

          {mode === "unconfigured" && (
            <div className="mt-7 rounded-lg bg-bg-muted p-4 text-[13px] leading-relaxed text-fg-muted">
              Sign-in isn&apos;t configured. Set <code className="font-mono text-fg">AUTH0_DOMAIN</code>, <code className="font-mono text-fg">AUTH0_CLIENT_ID</code>, <code className="font-mono text-fg">AUTH0_CLIENT_SECRET</code> and{" "}
              <code className="font-mono text-fg">AUTH0_SECRET</code>.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
