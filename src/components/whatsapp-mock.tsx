import { WaText } from "./wa-text";
import { LogoMark } from "./logo";

export interface MockMessage {
  body: string;
  time: string;
}

/** A realistic WhatsApp chat window showing HeadsApp alerts. */
export function WhatsAppMock({ messages, className = "" }: { messages: MockMessage[]; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[28px] border border-border bg-wa-bg shadow-[0_1px_0_rgba(0,0,0,0.02),0_30px_60px_-30px_rgba(0,0,0,0.25)] ${className}`}>
      <div className="flex items-center gap-3 bg-wa-header px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-bg">
          <LogoMark size={24} />
        </span>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-fg">HeadsApp</div>
          <div className="text-[12px] text-fg-muted">Business account</div>
        </div>
      </div>
      <div
        className="space-y-2 px-3 py-4 sm:px-4"
        style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      >
        {messages.map((m, i) => (
          <div key={i} className="relative max-w-[92%] rounded-xl rounded-tl-sm bg-wa-bubble px-3 pb-1.5 pt-2 text-[13.5px] leading-[1.45] text-fg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
            <WaText text={m.body} />
            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-fg-subtle">
              {m.time}
              <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true" className="text-[#53bdeb]">
                <path d="M11.07.65 4.6 7.12 1.93 4.45.5 5.88l4.1 4.1 7.9-7.9zM15.07.65 8.6 7.12l-.9-.9-1.43 1.43 2.33 2.33 7.9-7.9z" fill="currentColor" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
