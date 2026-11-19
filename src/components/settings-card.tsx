export function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-border py-8 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
      <div>
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="max-w-[520px]">{children}</div>
    </section>
  );
}
