import { MessageText } from "./message-text";

/*
 * One bot message as it appears in Telegram (light theme): white bubble with a tail,
 * sender name in Telegram blue, time bottom right. Used in onboarding and the Alerts log.
 */
export function MessageBubble({ body, time }: { body: string; time: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#e7ebf0] px-3.5 py-4 font-system">
      <div className="relative ml-2 max-w-[92%] rounded-[16px] rounded-bl-[6px] bg-white px-3 pb-[6px] pt-[7px] text-[14.5px] leading-[1.38] text-[#000] shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
        <svg className="absolute -left-[7px] bottom-0 text-white" width="9" height="16" viewBox="0 0 9 16" aria-hidden="true">
          <path d="M9 0v16H0c4 0 9-4 9-16z" fill="currentColor" />
        </svg>
        <div className="mb-0.5 text-[13.5px] font-semibold text-[#3390ec]">HeadsApp</div>
        <MessageText text={body} />
        <div className="-mb-0.5 mt-0.5 text-right text-[11.5px] text-[#8e9aa6]">{time}</div>
      </div>
    </div>
  );
}
