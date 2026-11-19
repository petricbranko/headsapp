import { WaText } from "./wa-text";

export interface MockMessage {
  body: string;
  time: string;
  /** Optional date divider shown above this message (e.g. "Monday"). */
  day?: string;
}

/* Colors taken from WhatsApp's iOS light/dark themes so the mock reads as the real thing. */
const wa = {
  wall: "bg-[#efe7dd] dark:bg-[#0b141a]",
  bubble: "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]",
  meta: "text-[#667781] dark:text-[#8696a0]",
  bar: "bg-[#f6f5f3]/95 dark:bg-[#1f2c34]/95",
};

function Ticks() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true" className="text-[#53bdeb]">
      <path d="M11.07.65 4.6 7.12 1.93 4.45.5 5.88l4.1 4.1 7.9-7.9zM15.07.65 8.6 7.12l-.9-.9-1.43 1.43 2.33 2.33 7.9-7.9z" fill="currentColor" />
    </svg>
  );
}

function Bubble({ m, first }: { m: MockMessage; first: boolean }) {
  return (
    <div className={`relative max-w-[86%] rounded-[14px] px-[9px] pb-[5px] pt-[6px] text-[14.5px] leading-[1.34] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${wa.bubble} ${first ? "rounded-tl-[4px]" : ""}`}>
      {first && (
        <svg className="absolute -left-[7px] top-0 text-white dark:text-[#202c33]" width="8" height="13" viewBox="0 0 8 13" aria-hidden="true">
          <path d="M8 0H1.5C.4 0-.3 1.2.3 2.1L8 13V0z" fill="currentColor" />
        </svg>
      )}
      <WaText text={m.body} />
      <div className={`-mb-0.5 mt-0.5 flex items-center justify-end gap-1 text-[11px] ${wa.meta}`}>
        {m.time}
        <Ticks />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className={`flex items-center gap-2.5 border-b border-black/[0.06] px-3 py-2 backdrop-blur dark:border-white/[0.06] ${wa.bar}`}>
      <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden="true" className="text-[#111b21] dark:text-[#e9edef]">
        <path d="M9.5 1.5 2 9l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="grid size-[34px] place-items-center rounded-full bg-[#1b1b19]">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="9" cy="11" r="7" fill="#fbfaf7" />
          <circle cx="15.5" cy="4.5" r="3" fill="#3fa66f" stroke="#1b1b19" strokeWidth="1.6" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1 text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
          HeadsApp
          <svg width="14" height="14" viewBox="0 0 24 24" aria-label="Verified business">
            <path fill="#25d366" d="m12 1 2.6 2.1 3.3-.3 1 3.2 2.9 1.6-1 3.2 1 3.2-2.9 1.6-1 3.2-3.3-.3L12 23l-2.6-2.1-3.3.3-1-3.2-2.9-1.6 1-3.2-1-3.2 2.9-1.6 1-3.2 3.3.3z" />
            <path d="m7.5 12.2 3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className={`text-[12px] ${wa.meta}`}>Business account</div>
      </div>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="text-[#111b21] dark:text-[#e9edef]">
        <path d="M15 10.5 20 7v10l-5-3.5M3.5 7.5A1.5 1.5 0 0 1 5 6h8.5A1.5 1.5 0 0 1 15 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Wallpaper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`${wa.wall} ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(rgba(120,100,70,0.07) 1px, transparent 1.2px), radial-gradient(rgba(120,100,70,0.05) 1px, transparent 1.2px)",
        backgroundSize: "22px 22px, 22px 22px",
        backgroundPosition: "0 0, 11px 11px",
      }}
    >
      {children}
    </div>
  );
}

function DayPill({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-lg bg-white/90 px-2.5 py-[3px] text-[11.5px] font-medium text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.1)] dark:bg-[#182229] dark:text-[#8696a0]">
        {label}
      </span>
    </div>
  );
}

function Thread({ messages, day = "Today" }: { messages: MockMessage[]; day?: string }) {
  return (
    <div className="space-y-1.5 px-3.5 pb-4 pt-1">
      {!messages[0]?.day && <DayPill label={day} />}
      {messages.map((m, i) => (
        <div key={i}>
          {m.day && <DayPill label={m.day} />}
          <div className="pl-1.5">
            <Bubble m={m} first={i === 0 || Boolean(m.day)} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A WhatsApp chat as a flat panel (used inside the app). */
export function WhatsAppMock({ messages, className = "" }: { messages: MockMessage[]; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-border font-system ${className}`}>
      <Header />
      <Wallpaper>
        <Thread messages={messages} />
      </Wallpaper>
    </div>
  );
}

/** A WhatsApp chat on an iPhone (used for marketing). */
export function PhoneMock({ messages, className = "" }: { messages: MockMessage[]; className?: string }) {
  return (
    <div className={`relative mx-auto w-[340px] rounded-[56px] bg-[#1b1b19] p-[11px] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.06),0_40px_80px_-30px_rgba(40,35,20,0.35)] ${className}`}>
      <div className="relative overflow-hidden rounded-[45px] bg-[#f6f5f3] font-system dark:bg-[#1f2c34]">
        <div className="relative flex h-[48px] items-end justify-between px-8 pb-2 text-[14px] font-semibold text-[#111b21] dark:text-[#e9edef]">
          <span>9:41</span>
          <span className="absolute left-1/2 top-[11px] h-[30px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1.5">
            <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true"><path fill="currentColor" d="M1 7h2.5v4H1zM5.5 5H8v6H5.5zM10 3h2.5v8H10zM14.5 0H17v11h-2.5z" /></svg>
            <svg width="24" height="11" viewBox="0 0 24 11" aria-hidden="true"><rect x=".5" y=".5" width="20" height="10" rx="3" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="15" height="7" rx="1.5" fill="currentColor" /><path d="M22 4v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".5" /></svg>
          </span>
        </div>
        <Header />
        <Wallpaper className="h-[560px]">
          <Thread messages={messages} />
        </Wallpaper>
        <div className={`flex items-center gap-2.5 px-3 pb-7 pt-2 ${wa.bar}`}>
          <span className="text-[22px] leading-none text-[#111b21] dark:text-[#e9edef]">+</span>
          <span className="h-8 flex-1 rounded-full border border-black/10 bg-white dark:border-white/10 dark:bg-[#2a3942]" />
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="text-[#111b21] dark:text-[#e9edef]"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </div>
      </div>
    </div>
  );
}
